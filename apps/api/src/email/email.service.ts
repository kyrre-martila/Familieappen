import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { getEmailConfig } from "./email.config";
import { EmailRenderResult } from "./templates/base.template";
import { familyInviteTemplate, FamilyInviteTemplateData } from "./templates/family-invite.template";
import { forgotPasswordTemplate, ForgotPasswordTemplateData } from "./templates/forgot-password.template";
import { wishlistInviteTemplate, WishlistInviteTemplateData } from "./templates/wishlist-invite.template";
import { shoppingListInviteTemplate, ShoppingListInviteTemplateData } from "./templates/shopping-list-invite.template";

export type EmailTemplate = "forgot-password" | "wishlist-invite" | "family-invite" | "shopping-list-invite";

export type EmailTemplateData = {
  "forgot-password": ForgotPasswordTemplateData;
  "wishlist-invite": WishlistInviteTemplateData;
  "family-invite": FamilyInviteTemplateData;
  "shopping-list-invite": ShoppingListInviteTemplateData;
};

export type SendEmailInput<TTemplate extends EmailTemplate = EmailTemplate> = {
  to: string | string[];
  subject?: string;
  template: TTemplate;
  data: EmailTemplateData[TTemplate];
};

export type EmailSendResult = {
  ok: boolean;
  mode: "provider" | "dev-log";
  messageId?: string;
  error?: string;
};

const renderers: { [TTemplate in EmailTemplate]: (data: EmailTemplateData[TTemplate]) => EmailRenderResult } = {
  "forgot-password": forgotPasswordTemplate,
  "wishlist-invite": wishlistInviteTemplate,
  "family-invite": familyInviteTemplate,
  "shopping-list-invite": shoppingListInviteTemplate
};

function normalizeRecipients(to: SendEmailInput["to"]): string[] {
  const recipients = (Array.isArray(to) ? to : [to]).map((recipient) => recipient.trim()).filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("sendEmail requires at least one recipient.");
  }

  return recipients;
}

function formatFromAddress(fromName: string, fromAddress: string): string {
  return `${fromName} <${fromAddress}>`;
}

@Injectable()
export class EmailService {
  async sendEmail<TTemplate extends EmailTemplate>(input: SendEmailInput<TTemplate>): Promise<EmailSendResult> {
    try {
      const config = getEmailConfig();
      const recipients = normalizeRecipients(input.to);
      const renderer = renderers[input.template] as (data: EmailTemplateData[TTemplate]) => EmailRenderResult;
      const rendered = renderer(input.data);
      const from = formatFromAddress(config.fromName, config.fromAddress);
      const subject = input.subject || rendered.subject;

      if (config.provider === "dev-log") {
        if (process.env.NODE_ENV !== "production") {
          console.info("[email:dev-log] Email provider is not configured. Email not sent.", {
            to: recipients,
            from,
            template: input.template,
            subject,
            link: rendered.link,
            text: rendered.text
          });
        }

        return { ok: true, mode: "dev-log" };
      }

      const smtp = config.smtp;

      if (!smtp) {
        throw new Error("SMTP configuration is missing.");
      }

      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass
        }
      });

      const result = await transporter.sendMail({
        to: recipients,
        from,
        subject,
        html: rendered.html,
        text: rendered.text
      });

      return { ok: true, mode: "provider", messageId: result.messageId };
    } catch (error) {
      return {
        ok: false,
        mode: process.env.EMAIL_PROVIDER ? "provider" : "dev-log",
        error: error instanceof Error ? error.message : "Unknown email error."
      };
    }
  }
}
