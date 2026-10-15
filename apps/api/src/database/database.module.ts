import { Module, type DynamicModule } from "@nestjs/common";
import { DATABASE_URL, PrismaService } from "./prisma.service.ts";

@Module({})
export class DatabaseModule {
  static register(databaseUrl: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATABASE_URL, useValue: databaseUrl }, PrismaService],
      exports: [PrismaService],
    };
  }
}
