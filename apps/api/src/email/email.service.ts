import { Injectable } from "@nestjs/common";

export type EmailTemplate = "wishlist-invite" | "family-invite";

export type SendEmailInput = {
  to: string | string[];
  subject?: string;
  template: EmailTemplate;
  data: {
    inviterName: string;
    ownerName?: string;
    familyName?: string;
    inviteUrl: string;
  };
};

export type EmailSendResult = {
  ok: boolean;
  mode: "provider" | "dev-log";
  messageId?: string;
  error?: string;
};

type ProviderEmailPayload = {
  to: string[];
  from: string;
  subject: string;
  html: string;
  text: string;
};

const TEMPLATE_SUBJECTS: Record<EmailTemplate, string> = {
  "wishlist-invite": "Du er invitert til en ønskeliste",
  "family-invite": "Du er invitert til en familie"
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeRecipients(to: SendEmailInput["to"]): string[] {
  const recipients = (Array.isArray(to) ? to : [to]).map((recipient) => recipient.trim()).filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("sendEmail requires at least one recipient.");
  }

  return recipients;
}

function formatFromAddress(): string {
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "FamilieAppen";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || "noreply@familieappen.no";

  return `${fromName} <${fromAddress}>`;
}

function renderWishlistInvite(data: SendEmailInput["data"]): { subject: string; html: string; text: string; link: string } {
  const subject = TEMPLATE_SUBJECTS["wishlist-invite"];
  const safeInviterName = escapeHtml(data.inviterName);
  const safeOwnerName = escapeHtml(data.ownerName ?? "Eier");
  const safeInviteUrl = escapeHtml(data.inviteUrl);
  const body = `${data.inviterName} har invitert deg til å følge ønskelisten til ${data.ownerName ?? "Eier"}.`;

  return {
    subject,
    html: `<!doctype html><html lang="no"><body style="margin:0;background:#f7f2ea;color:#2f2a25;font-family:Arial,sans-serif;"><main style="max-width:560px;margin:0 auto;padding:32px 20px;"><section style="background:#fff;border-radius:20px;padding:28px;border:1px solid #eadfce;"><h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(subject)}</h1><p style="font-size:16px;line-height:1.5;">${safeInviterName} har invitert deg til å følge ønskelisten til ${safeOwnerName}.</p><p style="margin:28px 0;"><a href="${safeInviteUrl}" style="display:inline-block;background:#7c5f45;color:#fff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;">Åpne ønskeliste</a></p><p style="font-size:13px;color:#6f6258;">Logg inn eller opprett konto for å legge til listen.</p></section></main></body></html>`,
    text: [subject, "", body, "", "Åpne ønskeliste:", data.inviteUrl].join("\n"),
    link: data.inviteUrl
  };
}


function renderFamilyInvite(data: SendEmailInput["data"]): { subject: string; html: string; text: string; link: string } {
  const subject = TEMPLATE_SUBJECTS["family-invite"];
  const safeInviterName = escapeHtml(data.inviterName);
  const safeFamilyName = escapeHtml(data.familyName ?? "familien");
  const safeInviteUrl = escapeHtml(data.inviteUrl);
  const body = `${data.inviterName} har invitert deg til ${data.familyName ?? "familien"} i FamilieAppen.`;

  return {
    subject,
    html: `<!doctype html><html lang="no"><body style="margin:0;background:#f7f2ea;color:#2f2a25;font-family:Arial,sans-serif;"><main style="max-width:560px;margin:0 auto;padding:32px 20px;"><section style="background:#fff;border-radius:20px;padding:28px;border:1px solid #eadfce;"><h1 style="margin:0 0 16px;font-size:24px;">${escapeHtml(subject)}</h1><p style="font-size:16px;line-height:1.5;">${safeInviterName} har invitert deg til ${safeFamilyName} i FamilieAppen.</p><p style="margin:28px 0;"><a href="${safeInviteUrl}" style="display:inline-block;background:#0b6b2f;color:#fff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;">Åpne invitasjon</a></p><p style="font-size:13px;color:#6f6258;">Logg inn eller opprett konto for å bli med.</p></section></main></body></html>`,
    text: [subject, "", body, "", "Åpne invitasjon:", data.inviteUrl].join("\n"),
    link: data.inviteUrl
  };
}

@Injectable()
export class EmailService {
  async sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
    try {
      const recipients = normalizeRecipients(input.to);
      const rendered = input.template === "family-invite" ? renderFamilyInvite(input.data) : renderWishlistInvite(input.data);
      const payload: ProviderEmailPayload = {
        to: recipients,
        from: formatFromAddress(),
        subject: input.subject || rendered.subject,
        html: rendered.html,
        text: rendered.text
      };

      if (!process.env.EMAIL_PROVIDER) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[email:dev-log] Email provider is not configured. Email not sent.", {
            to: recipients,
            from: payload.from,
            template: input.template,
            subject: payload.subject,
            link: rendered.link,
            text: rendered.text
          });
        }

        return { ok: true, mode: "dev-log" };
      }

      if (process.env.EMAIL_PROVIDER.trim().toLowerCase() !== "resend") {
        throw new Error(`Unsupported EMAIL_PROVIDER "${process.env.EMAIL_PROVIDER}".`);
      }

      const resendApiKey = process.env.RESEND_API_KEY?.trim();
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER is set to resend.");
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseBody = (await response.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

      if (!response.ok) {
        throw new Error(responseBody?.message || responseBody?.name || `Email provider request failed with status ${response.status}.`);
      }

      return { ok: true, mode: "provider", messageId: responseBody?.id };
    } catch (error) {
      return {
        ok: false,
        mode: process.env.EMAIL_PROVIDER ? "provider" : "dev-log",
        error: error instanceof Error ? error.message : "Unknown email error."
      };
    }
  }
}
