import { Module } from "@nestjs/common";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { NotificationsModule } from "../notifications";
import { HealthPlansController } from "./health-plans.controller";
import { HealthPlansService } from "./health-plans.service";
import { HealthPlanSchedulerService } from "./health-plan-scheduler.service";
import { HealthPlanNotificationService } from "./health-plan-notification.service";

/**
 * Domain boundary for Helseplan. Controllers, notifications and occurrence jobs are
 * intentionally deferred; importing this module reserves a distinct boundary from /health.
 */
@Module({ imports: [PrismaModule, FamiliesModule, NotificationsModule], controllers: [HealthPlansController], providers: [HealthPlansService, HealthPlanSchedulerService, HealthPlanNotificationService], exports: [HealthPlansService, HealthPlanSchedulerService, HealthPlanNotificationService] })
export class HealthPlansModule {}
