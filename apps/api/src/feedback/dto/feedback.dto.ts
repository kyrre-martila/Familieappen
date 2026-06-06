export type FeedbackTypeDto = "feedback" | "bug";

export interface SubmitFeedbackRequestDto {
  type?: unknown;
  message?: unknown;
  appVersion?: unknown;
}

export interface FeedbackSubmissionDto {
  id: string;
  type: FeedbackTypeDto;
  message: string;
  userId: string;
  familyId: string | null;
  userAgent: string | null;
  appVersion: string | null;
  createdAt: string;
}
