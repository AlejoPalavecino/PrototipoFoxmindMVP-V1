import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../.generated/prisma/client.ts";

export const DATABASE_URL = Symbol("DATABASE_URL");

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(DATABASE_URL) connectionString: string) {
    super({ adapter: new PrismaPg({
      connectionString, max: 5, connectionTimeoutMillis: 1000,
      query_timeout: 1000, statement_timeout: 1000, application_name: "foxmind-api",
    }) });
  }

  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
