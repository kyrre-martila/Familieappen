import { EmailFooter } from "./partials/footer";
import { EmailHeader } from "./partials/header";

export type EmailRenderResult = {
  subject: string;
  html: string;
  text: string;
  previewText?: string;
  link?: string;
};

export type BaseEmailTemplateInput = {
  previewText: string;
  icon: string;
  headline: string;
  intro: string;
  body?: string;
  ctaHtml: string;
  infoBoxHtml?: string;
  footerNote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildTextEmail(parts: Array<string | undefined | null>): string {
  return parts.filter((part): part is string => Boolean(part?.trim())).join("\n\n");
}

export function baseEmailTemplate(input: BaseEmailTemplateInput): string {
  const safePreview = escapeHtml(input.previewText);
  const bodyHtml = input.body ? `<p style="margin:0 0 24px 0;color:#50645d;font-size:16px;line-height:1.65;">${input.body}</p>` : "";

  return `<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <title>${escapeHtml(input.headline)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef5f1;color:#22332d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${safePreview}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background:#eef5f1;">
      <tr>
        <td align="center" style="padding:24px 12px 32px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0 18px 0;">${EmailHeader()}</td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid #dbe9e2;border-radius:28px;padding:34px 24px 30px 24px;box-shadow:0 18px 44px rgba(47,82,72,0.10);">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td align="center" style="padding:0 0 22px 0;">
                      <div style="width:64px;height:64px;border-radius:22px;background:#e4f1eb;color:#2f7460;font-size:30px;line-height:64px;text-align:center;">${escapeHtml(input.icon)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 14px 0;">
                      <h1 style="margin:0;color:#22332d;font-size:28px;line-height:1.18;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(input.headline)}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 0 28px 0;">
                      <p style="margin:0;color:#50645d;font-size:16px;line-height:1.65;">${input.intro}</p>
                    </td>
                  </tr>
                  ${bodyHtml ? `<tr><td align="center" style="padding:0 0 2px 0;">${bodyHtml}</td></tr>` : ""}
                  <tr>
                    <td align="center" style="padding:0 0 28px 0;">${input.ctaHtml}</td>
                  </tr>
                  ${input.infoBoxHtml ? `<tr><td style="padding:0 0 4px 0;">${input.infoBoxHtml}</td></tr>` : ""}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0 8px;">${EmailFooter({ note: input.footerNote })}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
