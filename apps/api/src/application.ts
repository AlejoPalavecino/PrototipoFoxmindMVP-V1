import "reflect-metadata";
import { Module, type DynamicModule } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ApiConfiguration } from "./configuration.ts";
import { DatabaseModule } from "./database/database.module.ts";
import { HealthController } from "./health/health.controller.ts";

@Module({})
class AppModule {
  static register(configuration: ApiConfiguration): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.register(configuration.databaseUrl)],
      controllers: [HealthController],
    };
  }
}

export async function createApplication(configuration: ApiConfiguration) {
  const app = await NestFactory.create(AppModule.register(configuration), { logger: false, abortOnError: false });
  app.setGlobalPrefix("api/v1");
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  return app;
}
