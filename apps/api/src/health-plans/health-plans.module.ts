import { Module } from "@nestjs/common";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { HealthPlansController } from "./health-plans.controller";
import { HealthPlansService } from "./health-plans.service";
import { HealthPlanSchedulerService } from "./health-plan-scheduler.service";

/**
 * Domain boundary for Helseplan. Controllers, notifications and occurrence jobs are
 * intentionally deferred; importing this module reserves a distinct boundary from /health.
 */
@Module({ imports: [PrismaModule, FamiliesModule], controllers: [HealthPlansController], providers: [HealthPlansService, HealthPlanSchedulerService], exports: [HealthPlansService, HealthPlanSchedulerService] })
export class HealthPlansModule {}
