import "reflect-metadata";
import { Inject, Module, Optional, type DynamicModule, type OnModuleDestroy } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from "./configuration.ts";
import { DatabaseModule } from "./database/database.module.ts";
import { HealthController } from "./health/health.controller.ts";
import { IdentityModule, IdentityRuntime, installIdentityTransport, type IdentityRuntimePorts } from './identity/index.ts';
import { FilesModule, FileService, createFileInfrastructure, installFilesTransport, FileHostLifecycle, type FileInfrastructure } from './files/index.ts';

export interface ApplicationOptions { readonly identity?: IdentityRuntimePorts }

@Module({})
class AppModule implements OnModuleDestroy {
  constructor(@Inject(IdentityRuntime) private readonly identity: IdentityRuntime,
    @Optional() @Inject(FileHostLifecycle) private readonly files?: FileHostLifecycle) {}
  // Nest destroys the root module before imported modules. Drain worker/sender before Prisma teardown,
  // for both framework close and native shutdown hooks; relying on beforeApplicationShutdown is too late.
  async onModuleDestroy(): Promise<void> {
    const outcomes = await Promise.allSettled([this.identity.shutdownMail(), this.files?.close()]);
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
  static register(configuration: ApiConfiguration, options: ApplicationOptions, infrastructure?: FileInfrastructure): DynamicModule {
    const database = DatabaseModule.register(configuration.databaseUrl);
    const identity = IdentityModule.register(database, configuration.identity, options.identity);
    return {
      module: AppModule,
      imports: [database, identity, ...(configuration.files && infrastructure
        ? [FilesModule.integrated(database, identity, configuration.files, infrastructure)] : [])],
      controllers: [HealthController],
    };
  }
}

export async function createApplication(configuration: ApiConfiguration, options: ApplicationOptions = {}) {
  const infrastructure = configuration.files ? createFileInfrastructure(configuration.files.infrastructure) : undefined;
  let app: Awaited<ReturnType<typeof NestFactory.create>> | undefined;
  try {
    app = await NestFactory.create(AppModule.register(configuration, options, infrastructure), { logger: false, abortOnError: false });
    const identity = app.get(IdentityRuntime);
    installIdentityTransport(app, identity);
    if (configuration.files) installFilesTransport(app, identity, app.get(FileService));
    app.setGlobalPrefix("api/v1");
    app.getHttpAdapter().getInstance().disable("x-powered-by");
    app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
    return app;
  } catch (error) {
    if (app) { try { await app.close(); } catch { /* Preserve the original sanitized startup failure. */ } }
    infrastructure?.close();
    throw error;
  }
}
