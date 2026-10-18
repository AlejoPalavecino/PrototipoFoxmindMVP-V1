import { Module, type DynamicModule } from '@nestjs/common';
import { InvitationService } from './invitations.ts';
import { ClassroomService } from './service.ts';
import { InvitationDeliveryWorker, type DeliveryOptions } from './delivery.ts';
import type { ClassroomPorts } from './contracts.ts';
import { PrismaService } from '../database/prisma.service.ts';
import { IdentityRuntime } from '../identity/runtime.ts';
import { FileService } from '../files/service.ts';
import type { ClassroomRuntimeConfiguration } from './configuration.ts';
import { ClassroomHostLifecycle, createIdentityClassroomAuthentication } from './host.ts';
import { LibraryCleanupWorker } from './library-cleanup.ts';

@Module({})
export class ClassroomsModule {
  static integrated(database: DynamicModule, identity: DynamicModule, files: DynamicModule,
    configuration: ClassroomRuntimeConfiguration,
    sender: Pick<DeliveryOptions, 'send'> & { close(): void }): DynamicModule {
    return { module: ClassroomsModule, imports: [database, identity, files], providers: [
      { provide: InvitationService, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, fileService: FileService) => new ClassroomService({
          ...configuration, database, files: fileService.store,
          authenticate: createIdentityClassroomAuthentication(runtime.configuration.security),
        }) },
      { provide: InvitationDeliveryWorker, inject: [PrismaService],
        useFactory: (database: PrismaService) => new InvitationDeliveryWorker({
          database, key: configuration.deliveryKey, send: sender.send,
        }) },
      { provide: LibraryCleanupWorker, inject: [PrismaService, FileService],
        useFactory: (database: PrismaService, files: FileService) => new LibraryCleanupWorker(database, files.storage) },
      { provide: ClassroomHostLifecycle, inject: [InvitationDeliveryWorker],
        useFactory: (worker: InvitationDeliveryWorker) => new ClassroomHostLifecycle(worker, sender) },
    ], exports: [InvitationService, ClassroomHostLifecycle, LibraryCleanupWorker] };
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
