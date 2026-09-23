import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { EmailModule } from "../email";
import { NotificationsModule } from "../notifications";
import { PrismaModule } from "../prisma";
import { FamiliesController } from "./families.controller";
import { FamilyAuthorizationService } from "./family-authorization.service";
import { FamiliesService } from "./families.service";
import { AddressLookupService } from "./address/address-lookup.service";
import { GeonorgeClient } from "./address/geonorge.client";

@Module({
  imports: [AuthModule, EmailModule, PrismaModule, NotificationsModule],
  controllers: [FamiliesController],
  providers: [FamiliesService, FamilyAuthorizationService, AddressLookupService, GeonorgeClient],
  exports: [FamiliesService, FamilyAuthorizationService]
})
export class FamiliesModule {}
