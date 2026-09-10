import { Module } from "@nestjs/common";

/**
 * Domain boundary for Helseplan. Controllers, notifications and occurrence jobs are
 * intentionally deferred; importing this module reserves a distinct boundary from /health.
 */
@Module({})
export class HealthPlansModule {}
