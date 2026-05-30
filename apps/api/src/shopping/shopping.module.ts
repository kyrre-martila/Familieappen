import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { ShoppingController } from "./shopping.controller";
import { ShoppingService } from "./shopping.service";

@Module({
  imports: [AuthModule, FamiliesModule, PrismaModule],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService]
})
export class ShoppingModule {}
