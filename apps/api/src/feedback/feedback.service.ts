import { HttpStatus, Injectable } from "@nestjs/common";
import { API_ERROR_CODES, ApiException } from "../common";
import { PrismaService } from "../prisma";
import { FeedbackSubmissionDto, FeedbackTypeDto, SubmitFeedbackRequestDto } from "./dto/feedback.dto";

const ALLOWED_FIELDS = new Set(["type", "message", "appVersion"]);
const MAX_SUBMISSIONS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MESSAGE = "Du har sendt flere meldinger på kort tid. Prøv igjen litt senere.";

type FeedbackRecord = {
  id: string;
  type: FeedbackTypeDto;
  message: string;
  userId: string;
  familyId: string | null;
  userAgent: string | null;
  appVersion: string | null;
  createdAt: Date;
};

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async submitFeedback(
    userId: string,
    body: SubmitFeedbackRequestDto,
    context: { familyId?: string; userAgent?: string }
  ): Promise<FeedbackSubmissionDto> {
    const input = this.validateBody(body);
    await this.enforceRateLimit(userId);
    const familyId = await this.getCurrentFamilyId(userId, context.familyId);

    const submission = await this.prisma.client.feedbackSubmission.create({
      data: {
        type: input.type,
        message: input.message,
        userId,
        familyId,
        userAgent: this.normalizeOptionalText(context.userAgent, 500),
        appVersion: input.appVersion
      }
    }) as FeedbackRecord;

    return this.toDto(submission);
  }

  private validateBody(body: SubmitFeedbackRequestDto): { type: FeedbackTypeDto; message: string; appVersion: string | null } {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_INVALID_INPUT, "Feedback type and message are required.");
    }

    const unknownField = Object.keys(body as Record<string, unknown>).find((field) => !ALLOWED_FIELDS.has(field));
    if (unknownField) {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_INVALID_INPUT, "Ukjent felt i tilbakemeldingen.");
    }

    if (body.type !== "feedback" && body.type !== "bug") {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_INVALID_INPUT, "Velg tilbakemelding eller feilrapport.");
    }

    if (typeof body.message !== "string") {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_MISSING_FIELD, "Melding er påkrevd.");
    }

    const message = body.message.trim();
    if (message.length < 5) {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_INVALID_INPUT, "Skriv minst 5 tegn.");
    }

    if (message.length > 2000) {
      throw new ApiException(HttpStatus.BAD_REQUEST, API_ERROR_CODES.VALIDATION_INVALID_INPUT, "Meldingen kan være maks 2000 tegn.");
    }

    return {
      type: body.type,
      message,
      appVersion: this.normalizeOptionalText(body.appVersion, 100)
    };
  }

  private async getCurrentFamilyId(userId: string, requestedFamilyId?: string): Promise<string | null> {
    if (requestedFamilyId) {
      const membership = await this.prisma.client.familyMember.findFirst({
        where: { userId, familyId: requestedFamilyId },
        select: { familyId: true }
      });

      return membership?.familyId ?? null;
    }

    const membership = await this.prisma.client.familyMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { familyId: true }
    });

    return membership?.familyId ?? null;
  }

  private async enforceRateLimit(userId: string): Promise<void> {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await this.prisma.client.feedbackSubmission.count({
      where: {
        userId,
        createdAt: { gte: windowStart }
      }
    });

    if (recentCount >= MAX_SUBMISSIONS) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, API_ERROR_CODES.RATE_LIMITED, RATE_LIMIT_MESSAGE);
    }
  }

  private normalizeOptionalText(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.slice(0, maxLength);
  }

  private toDto(submission: FeedbackRecord): FeedbackSubmissionDto {
    return {
      id: submission.id,
      type: submission.type,
      message: submission.message,
      userId: submission.userId,
      familyId: submission.familyId,
      userAgent: submission.userAgent,
      appVersion: submission.appVersion,
      createdAt: submission.createdAt.toISOString()
    };
  }
}
