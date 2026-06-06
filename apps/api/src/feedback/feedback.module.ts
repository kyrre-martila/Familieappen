import { Module } from "@nestjs/common";
import { AuthModule } from "../auth";
import { PrismaModule } from "../prisma";
import { FeedbackController } from "./feedback.controller";
import { FeedbackService } from "./feedback.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService]
})
export class FeedbackModule {}
