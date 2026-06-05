export type EmailTemplate =
  | "wishlist-invite"
  | "password-reset"
  | "email-verification"
  | "family-invite";

export type EmailDeliveryMode = "provider" | "dev-log";

export type EmailRecipient = string | string[];

export type EmailSendResult = {
  ok: boolean;
  mode: EmailDeliveryMode;
  messageId?: string;
  error?: string;
};

export type WishlistInviteEmailData = {
  inviterName: string;
  ownerName: string;
  inviteUrl: string;
};

export type PasswordResetEmailData = {
  resetUrl: string;
  recipientName?: string;
  expiresIn?: string;
};

export type EmailVerificationEmailData = {
  verificationUrl: string;
  recipientName?: string;
};

export type FamilyInviteEmailData = {
  inviterName: string;
  familyName: string;
  inviteUrl: string;
};

export type EmailTemplateDataMap = {
  "wishlist-invite": WishlistInviteEmailData;
  "password-reset": PasswordResetEmailData;
  "email-verification": EmailVerificationEmailData;
  "family-invite": FamilyInviteEmailData;
};

export type SendEmailInput<TTemplate extends EmailTemplate = EmailTemplate> = {
  to: EmailRecipient;
  subject?: string;
  template: TTemplate;
  data: EmailTemplateDataMap[TTemplate];
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
  link?: string;
};
