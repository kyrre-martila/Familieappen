import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FamiliesModule } from "../families";
import { EmailModule } from "../email";
import { NotificationsModule } from "../notifications";
import { PrismaModule } from "../prisma";
import { ShoppingController } from "./shopping.controller";
import { ShoppingService } from "./shopping.service";

@Module({
  imports: [AuthModule, FamiliesModule, PrismaModule, EmailModule, NotificationsModule],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService]
})
export class ShoppingModule {}
