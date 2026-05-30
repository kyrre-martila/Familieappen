import { Module } from "@nestjs/common";
import { ConfigModule } from "./config";
import { HealthModule } from "./health";
import { PrismaModule } from "./prisma";

@Module({
  imports: [ConfigModule, PrismaModule, HealthModule]
})
export class AppModule {}
