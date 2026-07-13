import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { PrismaModule } from "./prisma";
import { AdvertisementsController } from "./advertisements.controller";
import { AdvertisementsService } from "./advertisements.service";
@Module({ imports: [AuthModule, PrismaModule], controllers: [AdvertisementsController], providers: [AdvertisementsService], exports: [AdvertisementsService] })
export class AdvertisementsModule {}
