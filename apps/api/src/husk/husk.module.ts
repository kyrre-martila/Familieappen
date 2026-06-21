import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { NotificationsModule } from "../notifications";
import { HuskController } from "./husk.controller";
import { HuskService } from "./husk.service";

@Module({
  imports: [
    PrismaModule,
    FamiliesModule,
    AuthModule,
    NotificationsModule
  ],
  controllers: [HuskController],
  providers: [HuskService],
  exports: [HuskService]
})
export class HuskModule {}
