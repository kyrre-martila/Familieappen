import { Module } from "@nestjs/common";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { HuskController } from "./husk.controller";
import { HuskService } from "./husk.service";

@Module({
  imports: [PrismaModule, FamiliesModule],
  controllers: [HuskController],
  providers: [HuskService],
  exports: [HuskService]
})
export class HuskModule {}
