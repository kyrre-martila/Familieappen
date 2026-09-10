import { Module } from "@nestjs/common";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { HealthPlansController } from "./health-plans.controller";
import { HealthPlansService } from "./health-plans.service";

/**
 * Domain boundary for Helseplan. Controllers, notifications and occurrence jobs are
 * intentionally deferred; importing this module reserves a distinct boundary from /health.
 */
@Module({ imports: [PrismaModule, FamiliesModule], controllers: [HealthPlansController], providers: [HealthPlansService], exports: [HealthPlansService] })
export class HealthPlansModule {}
