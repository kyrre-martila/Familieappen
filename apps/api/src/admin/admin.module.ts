import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { ConfigModule } from "../config";
import { PrismaModule } from "../prisma";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";
import { AdminRolesGuard } from "./guards/admin-roles.guard";

@Module({
  imports: [AuthModule, ConfigModule, PrismaModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGuard, AdminRolesGuard],
  exports: [AdminAuthService, AdminAuthGuard, AdminRolesGuard]
})
export class AdminModule {}
