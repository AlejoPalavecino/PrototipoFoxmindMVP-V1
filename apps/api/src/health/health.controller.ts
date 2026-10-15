import { Controller, Get, Header, Inject, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.ts";

@Controller("health")
export class HealthController {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  @Get("live")
  @Header("Cache-Control", "no-store")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @Header("Cache-Control", "no-store")
  async ready() {
    try {
      await this.database.ping();
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
  }
}
