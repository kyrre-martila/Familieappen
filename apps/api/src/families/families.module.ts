import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { PrismaModule } from "../prisma";
import { FamiliesController } from "./families.controller";
import { FamilyAuthorizationService } from "./family-authorization.service";
import { FamiliesService } from "./families.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamilyAuthorizationService],
  exports: [FamiliesService, FamilyAuthorizationService]
})
export class FamiliesModule {}
