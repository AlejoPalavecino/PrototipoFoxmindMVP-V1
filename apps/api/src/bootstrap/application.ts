import "reflect-metadata";
import { createDiagnosticSink } from "../platform/diagnostics.ts";
import { Inject, Module, Optional, type DynamicModule, type OnModuleDestroy } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from './configuration.ts';
import { DatabaseModule } from '../platform/database/database.module.ts';
import { HealthController } from '../platform/health/health.controller.ts';
import { IdentityModule } from './identity-identity.module.ts';
import { IdentityRuntime } from './identity-runtime.ts';
import { installIdentityTransport } from '../modules/identity/accounts/presentation/transport.ts';
import type { IdentityRuntimePorts } from '../modules/identity/accounts/application/runtime.ts';
import { FilesModule } from './files-files.module.ts';
import { FileService } from '../modules/files/custody/infrastructure/service.ts';
import { createFileInfrastructure } from '../modules/files/custody/infrastructure/configuration.ts';
import { installFilesTransport, FileHostLifecycle } from './files-host.ts';
import type { FileInfrastructure } from '../modules/files/custody/infrastructure/configuration.ts';
import { ClassroomsModule } from './academic-classrooms.module.ts';
import { ACADEMIC_RUNTIME, type AcademicRuntime } from './academic-composition.ts';
import { ACADEMIC_FOXY_ACCESS, type AcademicFoxyAccess } from './academic-consumer-ports.ts';
import { academicHttpServices } from './academic-http-services.ts';
import { localInvitationSender } from './academic-delivery-composition.ts';
import { ClassroomHostLifecycle, installClassroomsTransport } from './academic-host.ts';
import { LibraryCleanupWorker } from '../modules/materials/library/infrastructure/library-cleanup.ts';
import { AgendaService } from '../modules/agenda/events/application/agenda-service.ts';
import { createAgendaUnitOfWork } from './agenda-composition.ts';
import { createAgendaAuthentication, installAgendaTransport } from './agenda-transport.ts';
import { PrismaService } from '../platform/database/prisma.service.ts';
import { ClassroomAiRuntime } from './academic-curriculum-ai-runtime.ts';

import { createHomeService } from '../modules/home/dashboard/application/service.ts';
import { createHomeUnitOfWork } from '../modules/home/dashboard/infrastructure/unit-of-work.ts';
import type { HomeService } from '../modules/home/dashboard/application/service.ts';
import { installHomeTransport } from './home-host.ts';
import { installAiQuotaTransport } from './ai-quota-transport.ts';

import { ActivityAiRuntime } from './academic-activity-ai-runtime.ts';
import { StudentAiRuntime } from './academic-student-runtime.ts';
import { GradingAiRuntime } from '../modules/grading/assistance/infrastructure/grading-ai/runtime.ts';
import { createFoxyRuntime, FOXY_RUNTIME } from './foxy-runtime.ts';
import { createFoxyAuthentication, installFoxyTransport } from './foxy-host.ts';
import { selectFoxyVisualProviders } from './foxy-visual-host-providers.ts';
import type { VisualProviders } from '../modules/foxy/visuals/application/visual-runtime-contracts.ts';
import { createGeminiFoxyTextAdapter } from '../modules/foxy/turns/infrastructure/providers/foxy-adapter.ts';
import { initializeAiExecutionPolicy } from '../platform/ai/execution-policy.ts';
import { startAiMonthlyBudgetRuntime } from '../platform/ai/monthly-budget-runtime.ts';
import { createFoxyFileOperations } from './foxy-file-integration.ts';
import { attachmentIntegration } from './attachment-integration.ts';
import { createStudyRuntime, STUDY_RUNTIME, type StudyRuntimeOptions } from './study-runtime.ts';
import { installStudyTransport } from './study-transport.ts';
import { installChatAttachmentTransport } from './chat-attachment-transport.ts';
import { createTransferGate } from '../platform/http/transfer-gate.ts';
import { installStudyUploads } from '../modules/study/folders/presentation/uploads/http.ts';
import { installStudyReminders } from '../modules/study/folders/presentation/reminders/http.ts';

const AI_MONTHLY_BUDGET_RUNTIME = 'AiMonthlyBudgetRuntime';

export interface ApplicationOptions extends StudyRuntimeOptions { readonly identity?: IdentityRuntimePorts; readonly foxy?: { textProvider?: Parameters<typeof createFoxyRuntime>[0]['provider']; visualProviders?: { IMAGE?: VisualProviders['IMAGE']; DIAGRAM?: VisualProviders['DIAGRAM'] } } }

function foxyConfiguration(ai: ApiConfiguration['ai']) {
  if (!ai) return null;
  const { model, maxInputTokens, maxOutputTokens, maxConcurrency, deadlineMs, maxJobAgeMs,
    dailyActorRequests, dailyGlobalRequests, inputUsdPerMillion, outputUsdPerMillion, dailyBudgetUsd, dailyActorBudgetUsd } = ai;
  return { model, maxInputTokens, maxOutputTokens, maxConcurrency, deadlineMs, maxJobAgeMs,
    dailyActorRequests, dailyGlobalRequests, inputUsdPerMillion, outputUsdPerMillion, dailyBudgetUsd,
    ...(dailyActorBudgetUsd === undefined ? {} : { dailyActorBudgetUsd }),
    ...(ai.executionProfiles ? { executionProfiles: ai.executionProfiles } : {}),
    ...(ai.legacyExecutionProfiles ? { legacyExecutionProfiles: ai.legacyExecutionProfiles } : {}) };
}
function foxyProvider(ai: ApiConfiguration['ai'], options: ApplicationOptions) {
  if (!ai) return null;
  if (options.foxy && Object.hasOwn(options.foxy, 'textProvider')) return options.foxy.textProvider ?? null;
  if (options.ai !== undefined) return null;
  return createGeminiFoxyTextAdapter(ai);
}
function visualProviders(configuration: ApiConfiguration, options: ApplicationOptions) {
  const override = options.ai !== undefined || !!options.foxy && (Object.hasOwn(options.foxy,'textProvider') || Object.hasOwn(options.foxy,'visualProviders'));
  return selectFoxyVisualProviders(configuration.ai,configuration.foxyVisual,{ enabled: override, providers: options.foxy?.visualProviders });
}
@Module({})
class AppModule implements OnModuleDestroy {
  constructor(@Inject(IdentityRuntime) private readonly identity: IdentityRuntime,
    @Optional() @Inject(FileHostLifecycle) private readonly files?: FileHostLifecycle,
    @Optional() @Inject(ClassroomHostLifecycle) private readonly classrooms?: ClassroomHostLifecycle,
    @Optional() @Inject(LibraryCleanupWorker) private readonly library?: LibraryCleanupWorker,
    @Optional() @Inject(ClassroomAiRuntime) private readonly ai?: ClassroomAiRuntime,
    @Optional() @Inject(ActivityAiRuntime) private readonly activityAi?: ActivityAiRuntime,
    @Optional() @Inject(StudentAiRuntime) private readonly studentAi?: StudentAiRuntime,
    @Optional() @Inject(GradingAiRuntime) private readonly gradingAi?: GradingAiRuntime,
    @Optional() @Inject(FOXY_RUNTIME) private readonly foxy?: ReturnType<typeof createFoxyRuntime>,
    @Optional() @Inject(STUDY_RUNTIME) private readonly study?:ReturnType<typeof createStudyRuntime>,
    @Inject(AI_MONTHLY_BUDGET_RUNTIME) private readonly stopAiBudget?: ReturnType<typeof startAiMonthlyBudgetRuntime>) {}
  // Nest destroys the root module before imported modules. Drain worker/sender before Prisma teardown,
  // for both framework close and native shutdown hooks; relying on beforeApplicationShutdown is too late.
  async onModuleDestroy(): Promise<void> {
    // Explicit material deletion uses the shared storage port; drain it before file infrastructure closes.
    const deletion = await Promise.allSettled([this.study?.close(),this.foxy?.onModuleDestroy(), this.library?.onModuleDestroy(), this.ai?.onModuleDestroy(), this.activityAi?.onModuleDestroy(), this.studentAi?.onModuleDestroy(), this.gradingAi?.onModuleDestroy()]);
    const outcomes = [...deletion, ...await Promise.allSettled([this.stopAiBudget?.(), this.identity.shutdownMail(), this.files?.close(), this.classrooms?.close()])];
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
  static register(configuration: ApiConfiguration, options: ApplicationOptions, infrastructure?: FileInfrastructure,
    invitationSender?: ReturnType<typeof localInvitationSender>): DynamicModule {
    const database = DatabaseModule.register(configuration.databaseUrl);
    const identity = IdentityModule.register(database, configuration.identity, options.identity);
    const files = configuration.files && infrastructure
      ? FilesModule.integrated(database, identity, configuration.files, infrastructure, attachmentIntegration) : undefined;
    if (configuration.classrooms && (!files || !invitationSender)) throw new Error('Classroom infrastructure unavailable.');
    return {
      module: AppModule,
      imports: [database, identity, ...(files ? [files] : []),
        ...(configuration.classrooms && files && invitationSender
          ? [ClassroomsModule.integrated(database, identity, files, configuration.classrooms, invitationSender, configuration.ai, options.ai)] : [])],
      controllers: [HealthController],
      providers: [{ provide: AI_MONTHLY_BUDGET_RUNTIME, inject: [PrismaService], useFactory: startAiMonthlyBudgetRuntime },
        ...(configuration.classrooms && files ? [{provide:STUDY_RUNTIME,inject:[PrismaService,IdentityRuntime,FileService],
        useFactory:(database:PrismaService,identity:IdentityRuntime,files:FileService)=>createStudyRuntime(database,identity,files,configuration,options)}, { provide: FOXY_RUNTIME, inject: [PrismaService, IdentityRuntime, FileService, ACADEMIC_FOXY_ACCESS],
        useFactory: (database: PrismaService, identity: IdentityRuntime, files: FileService, classrooms: AcademicFoxyAccess) =>
          createFoxyRuntime({ database, fileOperations: createFoxyFileOperations(files), classrooms, storage: { remove: key => infrastructure!.storage.remove(key) }, authenticate: createFoxyAuthentication(identity.configuration.security),
            configuration: foxyConfiguration(configuration.ai), provider: foxyProvider(configuration.ai, options),
            providerForExecution: configuration.ai && options.ai === undefined && !Object.hasOwn(options.foxy ?? {}, 'textProvider')
              ? pinned => createGeminiFoxyTextAdapter({ ...configuration.ai!, ...pinned }) : undefined,
            visualConfiguration: configuration.foxyVisual?.configuration, visualProviders: visualProviders(configuration,options),
            visualBudgetLimits: configuration.ai ? { dailyBudgetUsd: configuration.ai.dailyBudgetUsd, ...(configuration.ai.dailyActorBudgetUsd === undefined ? {} : { dailyActorBudgetUsd: configuration.ai.dailyActorBudgetUsd }), dailyActorRequests: configuration.ai.dailyActorRequests, dailyGlobalRequests: configuration.ai.dailyGlobalRequests } : null }) }] : []),
        { provide: 'HomeService', inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => createHomeService(
          createHomeUnitOfWork(database, createAgendaAuthentication(runtime.configuration.security),
            createDiagnosticSink(line => process.stderr.write(line)))) }, { provide: AgendaService, inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => new AgendaService(
          createAgendaUnitOfWork(database, createAgendaAuthentication(runtime.configuration.security))) }],
    };
  }
}

export async function createApplication(configuration: ApiConfiguration, options: ApplicationOptions = {}) {
  if (configuration.ai && options.ai === undefined) configuration.ai.legacyExecutionProfiles ??= {};
  const infrastructure = configuration.files ? createFileInfrastructure(configuration.files.infrastructure) : undefined;
  let invitationSender: ReturnType<typeof localInvitationSender> | undefined;
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  try {
    invitationSender = configuration.classrooms
      ? localInvitationSender(configuration.identity.mail.smtpPort, 'no-reply@foxmind.test') : undefined;
    app = await NestFactory.create(AppModule.register(configuration, options, infrastructure, invitationSender), { logger: false, abortOnError: false });
    if (configuration.ai && options.ai === undefined) await initializeAiExecutionPolicy(app.get(PrismaService), configuration.ai);
    const identity = app.get(IdentityRuntime);
    installIdentityTransport(app, identity);
    installAgendaTransport(app, identity, app.get(AgendaService));
    installHomeTransport(app, identity, app.get<HomeService>('HomeService'));
    installAiQuotaTransport(app, identity, app.get(PrismaService));
    // One process-wide bound for every transport that buffers whole files (memory and fairness).
    const transfers = createTransferGate();
    if (configuration.files) installFilesTransport(app, identity, app.get(FileService), transfers);
    if (configuration.classrooms) installClassroomsTransport(app, identity, academicHttpServices(app.get<AcademicRuntime>(ACADEMIC_RUNTIME)),
      { ai: configuration.ai ? app.get(ClassroomAiRuntime).service : undefined,
        activityAi: configuration.ai ? app.get(ActivityAiRuntime).service : undefined });
    if (configuration.classrooms && configuration.files) installFoxyTransport(app, identity, app.get<ReturnType<typeof createFoxyRuntime>>(FOXY_RUNTIME).services);
    if(configuration.classrooms&&configuration.files){
      const study=app.get<ReturnType<typeof createStudyRuntime>>(STUDY_RUNTIME);
      installChatAttachmentTransport(app,study.attachments,study.admit,transfers);
      installStudyUploads(app,study.uploads,study.admit,transfers);
      installStudyReminders(app,study.reminders,study.admit);
      installStudyTransport(app,identity,study.service);
    }
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().disable("x-powered-by");
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
    return app;
  } catch (error) {
    if (app) { try { await app.close(); } catch { /* Preserve the original sanitized startup failure. */ } }
    try { await infrastructure?.close(); } catch { /* Preserve the original sanitized startup failure. */ }
    invitationSender?.close();
    throw error;
  }
}
