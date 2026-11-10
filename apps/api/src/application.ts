import "reflect-metadata";
import { Inject, Module, Optional, type DynamicModule, type OnModuleDestroy } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from "./configuration.ts";
import { DatabaseModule } from "./database/database.module.ts";
import { HealthController } from "./health/health.controller.ts";
import { IdentityModule, IdentityRuntime, installIdentityTransport, type IdentityRuntimePorts } from './identity/index.ts';
import { FilesModule, FileService, createFileInfrastructure, installFilesTransport, FileHostLifecycle, type FileInfrastructure } from './files/index.ts';
import { ClassroomsModule } from './classrooms/classrooms.module.ts';
import { ClassroomService } from './classrooms/service.ts';
import { localInvitationSender } from './classrooms/delivery.ts';
import { ClassroomHostLifecycle, installClassroomsTransport } from './classrooms/host.ts';
import { LibraryCleanupWorker } from './classrooms/library-cleanup.ts';
import { AgendaService } from './modules/agenda/public.ts';
import { createAgendaUnitOfWork } from './bootstrap/agenda-composition.ts';
import { createAgendaAuthentication, installAgendaTransport } from './bootstrap/agenda-transport.ts';
import { PrismaService } from './database/prisma.service.ts';
import { ClassroomAiRuntime, type AiRuntimeOverride } from './classrooms/ai/runtime.ts';

import { createHomeService, createHomeUnitOfWork, type HomeService } from './home/index.ts';
import { installHomeTransport } from './home/integration.ts';

import { ActivityAiRuntime } from './classrooms/activity-ai/runtime.ts';
import { StudentAiRuntime } from './classrooms/student-ai/runtime.ts';
import { GradingAiRuntime } from './classrooms/grading-ai/runtime.ts';
import { createFoxyRuntime, createFoxyAuthentication, installFoxyTransport, selectFoxyVisualProviders, FOXY_RUNTIME, type VisualProviders } from './foxy-ai/index.ts';
import { createGeminiFoxyTextAdapter } from './ai/index.ts';
import { createFoxyFileOperations } from './foxy-file-integration.ts';
import { attachmentIntegration } from './attachment-integration.ts';
import {createStudyService} from './study-folders/index.ts';
import {createStudyAuthentication,installStudyTransport} from './study-folders/http.ts';
import {createStudyFileIntegration} from './study-file-integration.ts';
import {createStudyAgendaIntegration} from './study-agenda-integration.ts';
import {installStudyUploads} from './study-folders/uploads/http.ts';
import {createStudyReminderRuntime} from './study-folders/reminders/runtime.ts';
import {installStudyReminders} from './study-folders/reminders/http.ts';
import {executeStudy,generateDevelopmentFeedback,type StudyInput,type StudyProvider,type StudyPractice,type StudyAnswers} from './study-engine/index.ts';
import {createGeminiStudyProvider} from './ai/index.ts';
import {readSessionCookie} from './identity/index.ts';
const STUDY_RUNTIME='StudyRuntime';

export interface ApplicationOptions { readonly identity?: IdentityRuntimePorts; readonly ai?: AiRuntimeOverride; readonly study?:{provider:StudyProvider}; readonly foxy?: { textProvider?: Parameters<typeof createFoxyRuntime>[0]['provider']; visualProviders?: { IMAGE?: VisualProviders['IMAGE']; DIAGRAM?: VisualProviders['DIAGRAM'] } } }

function createStudyRuntime(database:PrismaService,identity:IdentityRuntime,files:FileService,configuration:ApiConfiguration,options:ApplicationOptions){
  const authenticate=createStudyAuthentication(identity.configuration.security),fileBridge=createStudyFileIntegration(files,{database,authenticate,quotaBytes:configuration.studyQuotaBytes});
  const provider=(context?:{ownerId:string;requestId:string;authorize?:()=>Promise<void>})=>{
    if(options.study)return {async generate(input:Parameters<StudyProvider['generate']>[0]){await context?.authorize?.();return options.study!.provider.generate(input);}};
    if(options.ai!==undefined||!configuration.ai||!context)throw Object.assign(new Error('AI_UNAVAILABLE'),{code:'AI_UNAVAILABLE'});
    return createGeminiStudyProvider(configuration.ai,database,context.ownerId,context.requestId,context.authorize);
  };
  const service=createStudyService({database,authenticate,files:fileBridge.port,agenda:createStudyAgendaIntegration(),
    generate:(input,context)=>executeStudy(input as StudyInput,provider(context)),
    feedback:(input,context)=>generateDevelopmentFeedback(input.practice as StudyPractice,input.answers as StudyAnswers,input.sources,provider(context))});
  const reminders=createStudyReminderRuntime({database,authenticate});
  const admit=async(request:import('node:http').IncomingMessage,response:import('node:http').ServerResponse)=>{
    void response;
    const cookie=readSessionCookie(request.headers.cookie),context=cookie.verifier?await identity.store.authenticate(cookie.verifier):null;
    if(!request.socket.remoteAddress)throw Object.assign(new Error('SERVICE_UNAVAILABLE'),{code:'SERVICE_UNAVAILABLE'});
    await identity.generalAdmission(request.socket.remoteAddress,context);
  };
  return {service,uploads:fileBridge.uploads,reminders,admit,close:()=>reminders.close()};
}

function foxyConfiguration(ai: ApiConfiguration['ai']) {
  if (!ai) return null;
  const { model, maxInputTokens, maxOutputTokens, maxConcurrency, deadlineMs, maxJobAgeMs,
    dailyActorRequests, dailyGlobalRequests, inputUsdPerMillion, outputUsdPerMillion, dailyBudgetUsd } = ai;
  return { model, maxInputTokens, maxOutputTokens, maxConcurrency, deadlineMs, maxJobAgeMs,
    dailyActorRequests, dailyGlobalRequests, inputUsdPerMillion, outputUsdPerMillion, dailyBudgetUsd };
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
    @Optional() @Inject(STUDY_RUNTIME) private readonly study?:ReturnType<typeof createStudyRuntime>) {}
  // Nest destroys the root module before imported modules. Drain worker/sender before Prisma teardown,
  // for both framework close and native shutdown hooks; relying on beforeApplicationShutdown is too late.
  async onModuleDestroy(): Promise<void> {
    // Explicit material deletion uses the shared storage port; drain it before file infrastructure closes.
    const deletion = await Promise.allSettled([this.study?.close(),this.foxy?.onModuleDestroy(), this.library?.onModuleDestroy(), this.ai?.onModuleDestroy(), this.activityAi?.onModuleDestroy(), this.studentAi?.onModuleDestroy(), this.gradingAi?.onModuleDestroy()]);
    const outcomes = [...deletion, ...await Promise.allSettled([this.identity.shutdownMail(), this.files?.close(), this.classrooms?.close()])];
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
      providers: [...(configuration.classrooms && files ? [{provide:STUDY_RUNTIME,inject:[PrismaService,IdentityRuntime,FileService],
        useFactory:(database:PrismaService,identity:IdentityRuntime,files:FileService)=>createStudyRuntime(database,identity,files,configuration,options)}, { provide: FOXY_RUNTIME, inject: [PrismaService, IdentityRuntime, FileService, ClassroomService],
        useFactory: (database: PrismaService, identity: IdentityRuntime, files: FileService, classrooms: ClassroomService) =>
          createFoxyRuntime({ database, fileOperations: createFoxyFileOperations(files), classrooms: { run: classrooms.run, classroom: classrooms.classroom }, storage: { remove: key => infrastructure!.storage.remove(key) }, authenticate: createFoxyAuthentication(identity.configuration.security),
            configuration: foxyConfiguration(configuration.ai), provider: foxyProvider(configuration.ai, options),
            visualConfiguration: configuration.foxyVisual?.configuration, visualProviders: visualProviders(configuration,options),
            visualBudgetLimits: configuration.ai ? { dailyBudgetUsd: configuration.ai.dailyBudgetUsd, dailyActorRequests: configuration.ai.dailyActorRequests, dailyGlobalRequests: configuration.ai.dailyGlobalRequests } : null }) }] : []),
        { provide: 'HomeService', inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => createHomeService(
          createHomeUnitOfWork(database, createAgendaAuthentication(runtime.configuration.security))) }, { provide: AgendaService, inject: [PrismaService, IdentityRuntime],
        useFactory: (database: PrismaService, runtime: IdentityRuntime) => new AgendaService(
          createAgendaUnitOfWork(database, createAgendaAuthentication(runtime.configuration.security))) }],
    };
  }
}

export async function createApplication(configuration: ApiConfiguration, options: ApplicationOptions = {}) {
  const infrastructure = configuration.files ? createFileInfrastructure(configuration.files.infrastructure) : undefined;
  let invitationSender: ReturnType<typeof localInvitationSender> | undefined;
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  try {
    invitationSender = configuration.classrooms
      ? localInvitationSender(configuration.identity.mail.smtpPort, 'no-reply@foxmind.test') : undefined;
    app = await NestFactory.create(AppModule.register(configuration, options, infrastructure, invitationSender), { logger: false, abortOnError: false });
    const identity = app.get(IdentityRuntime);
    installIdentityTransport(app, identity);
    installAgendaTransport(app, identity, app.get(AgendaService));
    installHomeTransport(app, identity, app.get<HomeService>('HomeService'));
    if (configuration.files) installFilesTransport(app, identity, app.get(FileService));
    if (configuration.classrooms) installClassroomsTransport(app, identity, app.get(ClassroomService),
      { ai: configuration.ai ? app.get(ClassroomAiRuntime).service : undefined,
        activityAi: configuration.ai ? app.get(ActivityAiRuntime).service : undefined });
    if (configuration.classrooms && configuration.files) installFoxyTransport(app, identity, app.get<ReturnType<typeof createFoxyRuntime>>(FOXY_RUNTIME).services);
    if(configuration.classrooms&&configuration.files){
      const study=app.get<ReturnType<typeof createStudyRuntime>>(STUDY_RUNTIME);
      installStudyUploads(app,study.uploads,study.admit);
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
