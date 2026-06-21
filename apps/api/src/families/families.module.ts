import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { EmailModule } from "../email";
import { NotificationsModule } from "../notifications";
import { PrismaModule } from "../prisma";
import { FamiliesController } from "./families.controller";
import { FamilyAuthorizationService } from "./family-authorization.service";
import { FamiliesService } from "./families.service";

@Module({
  imports: [AuthModule, EmailModule, PrismaModule, NotificationsModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamilyAuthorizationService],
  exports: [FamiliesService, FamilyAuthorizationService]
})
export class FamiliesModule {}
