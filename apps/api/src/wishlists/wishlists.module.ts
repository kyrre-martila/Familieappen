import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { FamiliesModule } from "../families";
import { PrismaModule } from "../prisma";
import { WishlistsController } from "./wishlists.controller";
import { WishlistsService } from "./wishlists.service";

@Module({
  imports: [AuthModule, PrismaModule, FamiliesModule],
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService]
})
export class WishlistsModule {}
