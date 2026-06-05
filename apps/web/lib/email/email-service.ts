import "server-only";

import { formatFromAddress, getEmailConfig, type EmailConfig } from "./email-config";
import { renderEmailTemplate } from "./email-templates";
import type {
  EmailSendResult,
  EmailTemplate,
  RenderedEmail,
  SendEmailInput,
} from "./email-types";

type ProviderEmailPayload = {
  to: string[];
  from: string;
  subject: string;
  html: string;
  text: string;
};

type EmailProviderAdapter = {
  send(payload: ProviderEmailPayload): Promise<{ messageId?: string }>;
};

function normalizeRecipients(to: SendEmailInput["to"]): string[] {
  const recipients = Array.isArray(to) ? to : [to];
  const normalized = recipients.map((recipient) => recipient.trim()).filter(Boolean);

  if (normalized.length === 0) {
    throw new Error("sendEmail requires at least one recipient.");
  }

  return normalized;
}

function createResendAdapter(config: EmailConfig): EmailProviderAdapter {
  if (!config.resendApiKey) {
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER is set to resend.");
  }

  return {
    async send(payload) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
        name?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          responseBody?.message ||
            responseBody?.name ||
            `Email provider request failed with status ${response.status}.`,
        );
      }

      return { messageId: responseBody?.id };
    },
  };
}

function createProviderAdapter(config: EmailConfig): EmailProviderAdapter {
  switch (config.provider) {
    case "resend":
      return createResendAdapter(config);
    default:
      throw new Error("No email provider configured.");
  }
}

function logDevEmail(
  input: SendEmailInput<EmailTemplate>,
  recipients: string[],
  renderedEmail: RenderedEmail,
  from: string,
): void {
  console.info("[email:dev-log] Email provider is not configured. Email not sent.", {
    to: recipients,
    from,
    template: input.template,
    subject: input.subject || renderedEmail.subject,
    link: renderedEmail.link,
    text: renderedEmail.text,
  });
}

export async function sendEmail<TTemplate extends EmailTemplate>(
  input: SendEmailInput<TTemplate>,
): Promise<EmailSendResult> {
  try {
    const config = getEmailConfig();
    const recipients = normalizeRecipients(input.to);
    const renderedEmail = renderEmailTemplate(input.template, input.data);
    const payload: ProviderEmailPayload = {
      to: recipients,
      from: formatFromAddress(config),
      subject: input.subject || renderedEmail.subject,
      html: renderedEmail.html,
      text: renderedEmail.text,
    };

    if (!config.provider) {
      if (config.isDevelopment) {
        logDevEmail(input as SendEmailInput<EmailTemplate>, recipients, renderedEmail, payload.from);
      }

      return { ok: true, mode: "dev-log" };
    }

    const provider = createProviderAdapter(config);
    const providerResult = await provider.send(payload);

    return {
      ok: true,
      mode: "provider",
      messageId: providerResult.messageId,
    };
  } catch (error) {
    return {
      ok: false,
      mode: process.env.EMAIL_PROVIDER ? "provider" : "dev-log",
      error: error instanceof Error ? error.message : "Unknown email error.",
    };
  }
}
