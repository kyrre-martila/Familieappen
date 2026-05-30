import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { ConfigModule } from "./config";
import { FamiliesModule } from "./families";
import { HealthModule } from "./health";
import { PrismaModule } from "./prisma";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule, FamiliesModule]
})
export class AppModule {}
