import { validateMailbox } from '../modules/identity/infrastructure/mail/mailbox.ts';
import { Module, type DynamicModule } from '@nestjs/common';
import { InvitationService } from './academic-management-composition.ts';
import { ClassroomService } from './academic-composition.ts';
import { InvitationDeliveryWorker, type DeliveryOptions } from './academic-delivery-composition.ts';
import type { ClassroomPorts } from '../modules/classrooms/infrastructure/contracts.ts';
import { PrismaService } from '../platform/database/prisma.service.ts';
import { IdentityRuntime } from './identity-runtime.ts';
import { FileService } from '../modules/files/infrastructure/service.ts';
import { createDurableActivitySourceReader } from '../modules/files/infrastructure/activity-source-reader.ts';
import { createDurableGradingAiAttachmentReader } from '../modules/files/infrastructure/durable-grading-ai-attachment-reader.ts';
import { createDurableGradingAiInstructionReader } from '../modules/files/infrastructure/durable-grading-ai-instruction-reader.ts';
import type { ClassroomRuntimeConfiguration } from '../modules/classrooms/infrastructure/configuration.ts';
import { ClassroomHostLifecycle, createIdentityClassroomAuthentication } from './academic-host.ts';
import { LibraryCleanupWorker } from '../modules/materials/infrastructure/library-cleanup.ts';
import { ClassroomAiRuntime, type AiRuntimeOverride } from './academic-curriculum-ai-runtime.ts';
import { ActivityAiRuntime } from './academic-activity-ai-runtime.ts';
import { createActivityAiAccess } from '../modules/activities/infrastructure/activity-ai/database.ts';
import { StudentAiRuntime } from './academic-student-runtime.ts';
import { GradingAiRuntime, type GradingAiFileGrant } from '../modules/grading/infrastructure/grading-ai/runtime.ts';
import { GeminiGradingAiProvider } from '../modules/grading/infrastructure/grading-ai/provider.ts';
import { GoogleGenAI } from '@google/genai';
import { validateActivityGeneration } from '../modules/activities/infrastructure/activity-ai/provenance.ts';
import type { AiConfiguration } from '../platform/ai/configuration.ts';
import { createDiagnosticSink } from '../platform/diagnostics.ts';

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
    const diagnostics = createDiagnosticSink(line => process.stderr.write(line));
    return { module: ClassroomsModule, imports: [database, identity, files], providers: [
      ...(ai && (!override || override.gradingProvider) ? [{ provide: GradingAiRuntime, inject: [PrismaService, FileService],
        useFactory: (database: PrismaService, files: FileService) => {
          let runtime: GradingAiRuntime;
          const authorize = (grant: import("../modules/files/infrastructure/grading-ai-attachment-reader.ts").GradingAttachmentGrant, signal: AbortSignal, tx?: import("../modules/files/application/contracts.ts").FileTransaction) =>
            runtime.authorizeClaim(grant as GradingAiFileGrant, signal, tx);
          const reader = createDurableGradingAiAttachmentReader({ files, authorize });
          const instructionReader = createDurableGradingAiInstructionReader({ files, authorize });
          const provider = override?.gradingProvider ?? new GeminiGradingAiProvider(new GoogleGenAI({ apiKey: ai.apiKey, vertexai: false,
            httpOptions: { retryOptions: { attempts: 1 }, timeout: ai.deadlineMs } }), ai);
          runtime = new GradingAiRuntime({ database, configuration: ai, provider, reader, instructionReader, diagnostics });
          return runtime;
        } }] : []),
      ...(ai && (!override || override.studentProvider) ? [{ provide: StudentAiRuntime, inject: [PrismaService, ClassroomService],
        useFactory: (database: PrismaService, classrooms: ClassroomService) =>
          new StudentAiRuntime({ database, progressView: classrooms.progressView }, ai, override?.studentProvider) }] : []),
      ...(ai ? [{ provide: ActivityAiRuntime, inject: [ClassroomService, FileService],
        useFactory: (classrooms: ClassroomService, files: FileService) =>
          new ActivityAiRuntime(createActivityAiAccess(classrooms.ports, classrooms.classroom), files, ai, override?.activityProvider) }, { provide: ClassroomAiRuntime, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, files: FileService) =>
          new ClassroomAiRuntime(database, createIdentityClassroomAuthentication(runtime.configuration.security), files, ai, override) }] : []),
      { provide: ClassroomService, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, fileService: FileService) => integratedClassrooms({
          ...configuration, database, validateMailbox, files: { load: fileService.store.load.bind(fileService.store), loadAuthorized: fileService.store.loadAuthorized.bind(fileService.store), promoteDraftPlanInTransaction: fileService.promoteDraftPlanInTransaction.bind(fileService) }, diagnostics, studentAiEnabled: !!ai && (!override || !!override.studentProvider),
          gradingAiAvailable: !!ai && (!override || !!override.gradingProvider),
          authenticate: createIdentityClassroomAuthentication(runtime.configuration.security),
        }, fileService) },
      { provide: InvitationService, useExisting: ClassroomService },
      { provide: InvitationDeliveryWorker, inject: [PrismaService],
        useFactory: (database: PrismaService) => new InvitationDeliveryWorker({
          database, key: configuration.deliveryKey, send: sender.send,
        }) },
      { provide: LibraryCleanupWorker, inject: [PrismaService, FileService],
        useFactory: (database: PrismaService, files: FileService) => new LibraryCleanupWorker(database, files.storage) },
      { provide: ClassroomHostLifecycle, inject: [InvitationDeliveryWorker],
        useFactory: (worker: InvitationDeliveryWorker) => new ClassroomHostLifecycle(worker, sender) },
    ], exports: [ClassroomService, InvitationService, ClassroomHostLifecycle, LibraryCleanupWorker, ...(ai ? [ClassroomAiRuntime, ActivityAiRuntime] : []),
      ...(ai && (!override || override.studentProvider) ? [StudentAiRuntime] : []),
      ...(ai && (!override || override.gradingProvider) ? [GradingAiRuntime] : [])] };
  }
  static register(
    ports: ClassroomPorts,
    delivery: Omit<DeliveryOptions, 'database' | 'key'>,
  ): DynamicModule {
    return {
      module: ClassroomsModule,
      providers: [
        { provide: ClassroomService, useValue: new ClassroomService(ports) },
        { provide: InvitationService, useExisting: ClassroomService },
        {
          provide: InvitationDeliveryWorker,
          useValue: new InvitationDeliveryWorker({
            ...delivery,
            database: ports.database,
            key: ports.deliveryKey,
          }),
        },
      ],
      exports: [ClassroomService, InvitationService],
    };
  }
}
