import "reflect-metadata";
import { Module, type DynamicModule } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from "./configuration.ts";
import { DatabaseModule } from "./database/database.module.ts";
import { HealthController } from "./health/health.controller.ts";
import { IdentityModule, IdentityRuntime, installIdentityTransport, type IdentityRuntimePorts } from './identity/index.ts';

export interface ApplicationOptions { readonly identity?: IdentityRuntimePorts }

@Module({})
class AppModule {
  static register(configuration: ApiConfiguration, options: ApplicationOptions): DynamicModule {
    const database = DatabaseModule.register(configuration.databaseUrl);
    return {
      module: AppModule,
      imports: [database, IdentityModule.register(database, configuration.identity, options.identity)],
      controllers: [HealthController],
    };
  }
}

export async function createApplication(configuration: ApiConfiguration, options: ApplicationOptions = {}) {
  const app = await NestFactory.create(AppModule.register(configuration, options), { logger: false, abortOnError: false });
  installIdentityTransport(app, app.get(IdentityRuntime));
  app.setGlobalPrefix("api/v1");
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
