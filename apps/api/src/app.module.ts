import { Module } from "@nestjs/common";
import { AuthModule } from "./auth";
import { ConfigModule } from "./config";
import { HealthModule } from "./health";
import { PrismaModule } from "./prisma";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule, AuthModule]
})
export class AppModule {}
