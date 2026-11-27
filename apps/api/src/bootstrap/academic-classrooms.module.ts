import { validateMailbox } from '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts';
import { Module, type DynamicModule } from '@nestjs/common';
import { InvitationService } from './academic-management-composition.ts';
import { ACADEMIC_RUNTIME, createAcademicRuntime, type AcademicRuntime } from './academic-composition.ts';
import { ACADEMIC_FOXY_ACCESS, ACADEMIC_STUDENT_PROGRESS, ACADEMIC_ACTIVITY_ACCESS,
  academicFoxyAccess, academicStudentProgress, academicActivityAccess,
  type AcademicStudentProgress, type AcademicActivityAccess } from './academic-consumer-ports.ts';
import { InvitationDeliveryWorker, type DeliveryOptions } from './academic-delivery-composition.ts';
import type { ClassroomPorts } from '../modules/classrooms/access/application/runtime-ports.ts';
import { PrismaService } from '../platform/database/prisma.service.ts';
import { IdentityRuntime } from './identity-runtime.ts';
import { FileService } from '../modules/files/custody/infrastructure/service.ts';
import { createDurableActivitySourceReader } from '../modules/files/custody/infrastructure/activity-source-reader.ts';
import { createDurableGradingAiAttachmentReader } from '../modules/files/custody/infrastructure/durable-grading-ai-attachment-reader.ts';
import { createDurableGradingAiInstructionReader } from '../modules/files/custody/infrastructure/durable-grading-ai-instruction-reader.ts';
import type { ClassroomRuntimeConfiguration } from '../modules/classrooms/access/infrastructure/configuration.ts';
import { ClassroomHostLifecycle, createIdentityClassroomAuthentication } from './academic-host.ts';
import { LibraryCleanupWorker } from '../modules/materials/library/infrastructure/library-cleanup.ts';
import { ClassroomAiRuntime, type AiRuntimeOverride } from './academic-curriculum-ai-runtime.ts';
import { ActivityAiRuntime } from './academic-activity-ai-runtime.ts';
import { createActivityAiAccess } from '../modules/activities/generation/infrastructure/activity-ai/database.ts';
import { StudentAiRuntime } from './academic-student-runtime.ts';
import { TeacherWritingWorker } from '../modules/grading/student-analysis/infrastructure/teacher-writing-worker.ts';
import { GradingAiRuntime, type GradingAiFileGrant } from '../modules/grading/assistance/infrastructure/grading-ai/runtime.ts';
import { createGradingAiProvider } from '../modules/grading/assistance/infrastructure/grading-ai/provider.ts';
import { validateActivityGeneration } from '../modules/activities/generation/infrastructure/activity-ai/provenance.ts';
import type { AiConfiguration } from '../platform/ai/configuration.ts';
import { createDiagnosticSink } from '../platform/diagnostics.ts';
import { INVITATION_DELIVERY_BUDGETS } from '../modules/classrooms/invitations/application/invitations-operations.ts';

/** S6: durable per-teacher invitation quota in the shared identity admission store (no new table). */
export function invitationDeliveryAdmission(runtime: Pick<IdentityRuntime, 'admitBuckets'>) {
  return (actorId: string) => runtime.admitBuckets([
    { action: 'general-identity', namespace: 'identifier', subject: `classroom-invitation:day:${actorId}`, budget: INVITATION_DELIVERY_BUDGETS.day },
    { action: 'general-identity', namespace: 'identifier', subject: `classroom-invitation:hour:${actorId}`, budget: INVITATION_DELIVERY_BUDGETS.hour },
  ]);
}

function integratedClassrooms(ports: ClassroomPorts, files: FileService): AcademicRuntime {
  // Publication checks existing provenance even while generation/provider configuration is disabled.
  const reader = createDurableActivitySourceReader({ files, authorize: async () => {
    throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  } });
  return createAcademicRuntime({ ...ports,
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
          const authorize = (grant: import("../modules/files/custody/infrastructure/grading-ai-attachment-reader.ts").GradingAttachmentGrant, signal: AbortSignal, tx?: import("../modules/files/custody/application/contracts.ts").FileTransaction) =>
            runtime.authorizeClaim(grant as GradingAiFileGrant, signal, tx);
          const reader = createDurableGradingAiAttachmentReader({ files, authorize });
          const instructionReader = createDurableGradingAiInstructionReader({ files, authorize });
          const provider = override?.gradingProvider ?? createGradingAiProvider(ai);
          runtime = new GradingAiRuntime({ database, configuration: ai, provider, reader, instructionReader, diagnostics,
            ...(!override?.gradingProvider ? { providerForExecution: (execution: AiConfiguration) => createGradingAiProvider(execution) } : {}) });
          return runtime;
        } }] : []),
      ...(ai && (!override || override.studentProvider) ? [{ provide: StudentAiRuntime, inject: [PrismaService, ACADEMIC_STUDENT_PROGRESS],
        useFactory: (database: PrismaService, progress: AcademicStudentProgress) =>
          new StudentAiRuntime({ database, progressView: progress.progressView }, ai, override?.studentProvider) }] : []),
      { provide: TeacherWritingWorker, inject: [PrismaService],
        useFactory: (database: PrismaService) => new TeacherWritingWorker(
          database, !override || override.teacherWritingProvider ? ai : undefined, override?.teacherWritingProvider) },
      ...(ai ? [{ provide: ActivityAiRuntime, inject: [ACADEMIC_ACTIVITY_ACCESS, FileService],
        useFactory: (classrooms: AcademicActivityAccess, files: FileService) =>
          new ActivityAiRuntime(createActivityAiAccess(classrooms.ports, classrooms.classroom), files, ai, override?.activityProvider) }, { provide: ClassroomAiRuntime, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, files: FileService) =>
          new ClassroomAiRuntime(database, createIdentityClassroomAuthentication(runtime.configuration.security), files, ai, override) }] : []),
      { provide: ACADEMIC_RUNTIME, inject: [PrismaService, IdentityRuntime, FileService],
        useFactory: (database: PrismaService, runtime: IdentityRuntime, fileService: FileService) => integratedClassrooms({
          ...configuration, database, validateMailbox, files: { load: fileService.store.load.bind(fileService.store), loadAuthorized: fileService.store.loadAuthorized.bind(fileService.store), promoteDraftPlanInTransaction: fileService.promoteDraftPlanInTransaction.bind(fileService) }, diagnostics, studentAiEnabled: !!ai && (!override || !!override.studentProvider),
          gradingAiAvailable: !!ai && (!override || !!override.gradingProvider),
          teacherWritingEnabled: !!ai && (!override || !!override.teacherWritingProvider),
          authenticate: createIdentityClassroomAuthentication(runtime.configuration.security),
          admitInvitationDelivery: invitationDeliveryAdmission(runtime),
        }, fileService) },
      { provide: ACADEMIC_FOXY_ACCESS, inject: [ACADEMIC_RUNTIME], useFactory: academicFoxyAccess },
      { provide: ACADEMIC_STUDENT_PROGRESS, inject: [ACADEMIC_RUNTIME], useFactory: academicStudentProgress },
      { provide: ACADEMIC_ACTIVITY_ACCESS, inject: [ACADEMIC_RUNTIME], useFactory: academicActivityAccess },
      { provide: InvitationService, inject: [ACADEMIC_RUNTIME], useFactory: (runtime: AcademicRuntime) => runtime.classrooms.invitations },
      { provide: InvitationDeliveryWorker, inject: [PrismaService],
        useFactory: (database: PrismaService) => new InvitationDeliveryWorker({
          database, key: configuration.deliveryKey, previousKeys: configuration.previousDeliveryKeys, send: sender.send,
        }) },
      { provide: LibraryCleanupWorker, inject: [PrismaService, FileService],
        useFactory: (database: PrismaService, files: FileService) => new LibraryCleanupWorker(database, files.storage) },
      { provide: ClassroomHostLifecycle, inject: [InvitationDeliveryWorker],
        useFactory: (worker: InvitationDeliveryWorker) => new ClassroomHostLifecycle(worker, sender) },
    ], exports: [ACADEMIC_RUNTIME, ACADEMIC_FOXY_ACCESS, InvitationService, ClassroomHostLifecycle, LibraryCleanupWorker, ...(ai ? [ClassroomAiRuntime, ActivityAiRuntime] : []),
      ...(ai && (!override || override.studentProvider) ? [StudentAiRuntime] : []),
      ...(ai && (!override || override.gradingProvider) ? [GradingAiRuntime] : [])] };
  }
  static register(
    ports: ClassroomPorts,
    delivery: Omit<DeliveryOptions, 'database' | 'key' | 'previousKeys'>,
  ): DynamicModule {
    return {
      module: ClassroomsModule,
      providers: [
        { provide: ACADEMIC_RUNTIME, useValue: createAcademicRuntime(ports) },
        { provide: ACADEMIC_FOXY_ACCESS, inject: [ACADEMIC_RUNTIME], useFactory: academicFoxyAccess },
        { provide: ACADEMIC_STUDENT_PROGRESS, inject: [ACADEMIC_RUNTIME], useFactory: academicStudentProgress },
        { provide: ACADEMIC_ACTIVITY_ACCESS, inject: [ACADEMIC_RUNTIME], useFactory: academicActivityAccess },
        { provide: InvitationService, inject: [ACADEMIC_RUNTIME], useFactory: (runtime: AcademicRuntime) => runtime.classrooms.invitations },
        {
          provide: InvitationDeliveryWorker,
          useValue: new InvitationDeliveryWorker({
            ...delivery,
            database: ports.database,
            key: ports.deliveryKey,
            previousKeys: ports.previousDeliveryKeys,
          }),
        },
      ],
      exports: [ACADEMIC_RUNTIME, ACADEMIC_FOXY_ACCESS, InvitationService],
    };
  }
}
