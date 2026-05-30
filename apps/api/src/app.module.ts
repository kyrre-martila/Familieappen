import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { HealthModule } from "./health";
import { PrismaModule } from "./prisma";
import { ShoppingModule } from "./shopping";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule, FamiliesModule, ShoppingModule]
})
export class AppModule {}
