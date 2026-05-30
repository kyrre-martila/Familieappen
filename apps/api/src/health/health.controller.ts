import { Controller, Get } from "@nestjs/common";
import { createApiResponse, ApiResponse } from "../common";
import { PrismaService } from "../prisma";

type DatabaseHealthStatus = "ok" | "unavailable" | "not_configured";

interface HealthResponse {
  status: "ok";
  service: "familieappen-api";
  database: DatabaseHealthStatus;
}

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return createApiResponse({
      status: "ok",
      service: "familieappen-api",
      database: await this.getDatabaseStatus()
    });
  }

  private async getDatabaseStatus(): Promise<DatabaseHealthStatus> {
    if (!this.prisma.isConfigured) {
      return "not_configured";
    }

    return (await this.prisma.checkConnection()) ? "ok" : "unavailable";
  }
}
