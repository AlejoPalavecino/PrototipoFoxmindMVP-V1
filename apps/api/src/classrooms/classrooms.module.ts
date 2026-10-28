import { Module, type DynamicModule } from '@nestjs/common';
import { InvitationService } from './invitations.ts';
import { ClassroomService } from './service.ts';
import { InvitationDeliveryWorker, type DeliveryOptions } from './delivery.ts';
import type { ClassroomPorts } from './contracts.ts';
import { PrismaService } from '../database/prisma.service.ts';
import { IdentityRuntime } from '../identity/runtime.ts';
import { FileService, createDurableActivitySourceReader } from '../files/index.ts';
import type { ClassroomRuntimeConfiguration } from './configuration.ts';
import { ClassroomHostLifecycle, createIdentityClassroomAuthentication } from './host.ts';
import { LibraryCleanupWorker } from './library-cleanup.ts';
import { ClassroomAiRuntime, type AiRuntimeOverride } from './ai/runtime.ts';
import { ActivityAiRuntime } from './activity-ai/runtime.ts';
import { StudentAiRuntime } from './student-ai/runtime.ts';
import { validateActivityGeneration } from './activity-ai/index.ts';
import type { AiConfiguration } from '../ai/index.ts';

function integratedClassrooms(ports: ClassroomPorts, files: FileService): ClassroomService {
  // Publication checks existing provenance even while generation/provider configuration is disabled.
  const reader = createDurableActivitySourceReader({ files, authorize: async () => {
    throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  } });
  return new ClassroomService({ ...ports,
    validateActivityGeneration: (tx, request, id) => validateActivityGeneration({ reader }, tx, request, id) });
}

@Module({})
export class ClassroomsModule {
  static integrated(database: DynamicModule, identity: DynamicModule, files: DynamicModule,
    configuration: ClassroomRuntimeConfiguration,
    sender: Pick<DeliveryOptions, 'send'> & { close(): void }, ai?: AiConfiguration, override?: AiRuntimeOverride): DynamicModule {
    return { module: ClassroomsModule, imports: [database, identity, files], providers: [
      ...(ai && (!override || override.studentProvider) ? [{ provide: StudentAiRuntime, inject: [InvitationService],
        useFactory: (classrooms: ClassroomService) => new StudentAiRuntime(classrooms, ai, override?.studentProvider) }] : []),
      ...(ai ? [{ provide: ActivityAiRuntime, inject: [InvitationService, FileService],
        useFactory: (classrooms: ClassroomService, files: FileService) =>
          new ActivityAiRuntime(classrooms, files, ai, override?.activityProvider) }, { provide: ClassroomAiRuntime, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, files: FileService) =>
          new ClassroomAiRuntime(database, createIdentityClassroomAuthentication(runtime.configuration.security), files, ai, override) }] : []),
      { provide: InvitationService, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, fileService: FileService) => integratedClassrooms({
          ...configuration, database, files: fileService.store, studentAiEnabled: !!ai && (!override || !!override.studentProvider),
          authenticate: createIdentityClassroomAuthentication(runtime.configuration.security),
        }, fileService) },
      { provide: InvitationDeliveryWorker, inject: [PrismaService],
        useFactory: (database: PrismaService) => new InvitationDeliveryWorker({
          database, key: configuration.deliveryKey, send: sender.send,
        }) },
      { provide: LibraryCleanupWorker, inject: [PrismaService, FileService],
        useFactory: (database: PrismaService, files: FileService) => new LibraryCleanupWorker(database, files.storage) },
      { provide: ClassroomHostLifecycle, inject: [InvitationDeliveryWorker],
        useFactory: (worker: InvitationDeliveryWorker) => new ClassroomHostLifecycle(worker, sender) },
    ], exports: [InvitationService, ClassroomHostLifecycle, LibraryCleanupWorker, ...(ai ? [ClassroomAiRuntime, ActivityAiRuntime] : []),
      ...(ai && (!override || override.studentProvider) ? [StudentAiRuntime] : [])] };
  }
  static register(
    ports: ClassroomPorts,
    delivery: Omit<DeliveryOptions, 'database' | 'key'>,
  ): DynamicModule {
    return {
      module: ClassroomsModule,
      providers: [
        { provide: InvitationService, useValue: new ClassroomService(ports) },
        {
          provide: InvitationDeliveryWorker,
          useValue: new InvitationDeliveryWorker({
            ...delivery,
            database: ports.database,
            key: ports.deliveryKey,
          }),
        },
      ],
      exports: [InvitationService],
    };
  }
}
