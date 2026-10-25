import "reflect-metadata";
import { Inject, Module, Optional, type DynamicModule, type OnModuleDestroy } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from "./configuration.ts";
import { DatabaseModule } from "./database/database.module.ts";
import { HealthController } from "./health/health.controller.ts";
import { IdentityModule, IdentityRuntime, installIdentityTransport, type IdentityRuntimePorts } from './identity/index.ts';
import { FilesModule, FileService, createFileInfrastructure, installFilesTransport, FileHostLifecycle, type FileInfrastructure } from './files/index.ts';
import { ClassroomsModule } from './classrooms/classrooms.module.ts';
import { InvitationService } from './classrooms/invitations.ts';
import type { ClassroomService } from './classrooms/service.ts';
import { localInvitationSender } from './classrooms/delivery.ts';
import { ClassroomHostLifecycle, installClassroomsTransport } from './classrooms/host.ts';
import { LibraryCleanupWorker } from './classrooms/library-cleanup.ts';
import { AgendaService, createAgendaUnitOfWork } from './agenda/index.ts';
import { createAgendaAuthentication, installAgendaTransport } from './agenda/integration.ts';
import { PrismaService } from './database/prisma.service.ts';
import { ClassroomAiRuntime, type AiRuntimeOverride } from './classrooms/ai/runtime.ts';

import { createHomeService, createHomeUnitOfWork, type HomeService } from './home/index.ts';
import { installHomeTransport } from './home/integration.ts';

import { ActivityAiRuntime } from './classrooms/activity-ai/runtime.ts';

export interface ApplicationOptions { readonly identity?: IdentityRuntimePorts; readonly ai?: AiRuntimeOverride }

@Module({})
class AppModule implements OnModuleDestroy {
  constructor(@Inject(IdentityRuntime) private readonly identity: IdentityRuntime,
    @Optional() @Inject(FileHostLifecycle) private readonly files?: FileHostLifecycle,
    @Optional() @Inject(ClassroomHostLifecycle) private readonly classrooms?: ClassroomHostLifecycle,
    @Optional() @Inject(LibraryCleanupWorker) private readonly library?: LibraryCleanupWorker,
    @Optional() @Inject(ClassroomAiRuntime) private readonly ai?: ClassroomAiRuntime,
    @Optional() @Inject(ActivityAiRuntime) private readonly activityAi?: ActivityAiRuntime) {}
  // Nest destroys the root module before imported modules. Drain worker/sender before Prisma teardown,
  // for both framework close and native shutdown hooks; relying on beforeApplicationShutdown is too late.
  async onModuleDestroy(): Promise<void> {
    // Explicit material deletion uses the shared storage port; drain it before file infrastructure closes.
    const deletion = await Promise.allSettled([this.library?.onModuleDestroy(), this.ai?.onModuleDestroy(), this.activityAi?.onModuleDestroy()]);
    const outcomes = [...deletion, ...await Promise.allSettled([this.identity.shutdownMail(), this.files?.close(), this.classrooms?.close()])];
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
  static register(configuration: ApiConfiguration, options: ApplicationOptions, infrastructure?: FileInfrastructure,
    invitationSender?: ReturnType<typeof localInvitationSender>): DynamicModule {
    const database = DatabaseModule.register(configuration.databaseUrl);
    const identity = IdentityModule.register(database, configuration.identity, options.identity);
    const files = configuration.files && infrastructure
      ? FilesModule.integrated(database, identity, configuration.files, infrastructure) : undefined;
    if (configuration.classrooms && (!files || !invitationSender)) throw new Error('Classroom infrastructure unavailable.');
    return {
      module: AppModule,
      imports: [database, identity, ...(files ? [files] : []),
        ...(configuration.classrooms && files && invitationSender
          ? [ClassroomsModule.integrated(database, identity, files, configuration.classrooms, invitationSender, configuration.ai, options.ai)] : [])],
      controllers: [HealthController],
      providers: [{ provide: 'HomeService', inject: [PrismaService, IdentityRuntime],
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
    if (configuration.classrooms) installClassroomsTransport(app, identity, app.get<ClassroomService>(InvitationService),
      { ai: configuration.ai ? app.get(ClassroomAiRuntime).service : undefined,
        activityAi: configuration.ai ? app.get(ActivityAiRuntime).service : undefined });
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().disable("x-powered-by");
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
    return app;
  } catch (error) {
    if (app) { try { await app.close(); } catch { /* Preserve the original sanitized startup failure. */ } }
    infrastructure?.close();
    invitationSender?.close();
    throw error;
  }
}
