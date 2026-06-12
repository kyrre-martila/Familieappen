import { Module } from "@nestjs/common";
import { ConfigModule } from "../config";
import { EmailModule } from "../email";
import { PrismaModule } from "../prisma";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { AuthGuard } from "./guards/auth.guard";

@Module({
  imports: [ConfigModule, EmailModule, PrismaModule],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, AuthGuard, ProfileService],
  exports: [AuthService, AuthGuard]
})
export class AuthModule {}
