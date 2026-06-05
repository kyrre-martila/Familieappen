import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { EmailModule } from "../email";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { WishlistsController } from "./wishlists.controller";
import { WishlistsService } from "./wishlists.service";

@Module({
  imports: [AuthModule, PrismaModule, FamiliesModule, EmailModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService]
})
export class WishlistsModule {}
