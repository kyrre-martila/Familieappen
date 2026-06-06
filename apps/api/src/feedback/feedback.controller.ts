import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/auth.guard";
import { ApiResponse, createApiResponse } from "../common";
import { SubmitFeedbackRequestDto, FeedbackSubmissionDto } from "./dto/feedback.dto";
import { FeedbackService } from "./feedback.service";

type AuthenticatedRequest = {
  user: {
    id: string;
    email: string;
  };
};

@Controller("feedback")
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @Req() request: AuthenticatedRequest,
    @Body() body: SubmitFeedbackRequestDto,
    @Headers("x-family-id") familyId?: string,
    @Headers("user-agent") userAgent?: string
  ): Promise<ApiResponse<FeedbackSubmissionDto>> {
    return createApiResponse(await this.feedbackService.submitFeedback(request.user.id, body, { familyId, userAgent }));
  }
}
