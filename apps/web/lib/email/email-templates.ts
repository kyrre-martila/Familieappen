import type {
  EmailTemplate,
  EmailTemplateDataMap,
  RenderedEmail,
} from "./email-types";

const templateSubjects: Record<EmailTemplate, string> = {
  "wishlist-invite": "Du er invitert til en ønskeliste",
  "password-reset": "Tilbakestill passordet ditt",
  "email-verification": "Bekreft e-postadressen din",
  "family-invite": "Du er invitert til en familie",
};

function assertStringField(
  data: Record<string, unknown>,
  fieldName: string,
  template: EmailTemplate,
): string {
  const value = data[fieldName];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Email template "${template}" requires a non-empty "${fieldName}" value.`,
    );
  }

  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLayout(content: string): string {
  return `<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FamilieAppen</title>
  </head>
  <body style="margin:0;background:#f7f2ea;color:#2f2a25;font-family:Arial,sans-serif;">
    <main style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <section style="background:#ffffff;border-radius:20px;padding:28px;border:1px solid #eadfce;">
        ${content}
      </section>
    </main>
  </body>
</html>`;
}

function renderButton(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);

  return `<p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;background:#7c5f45;color:#ffffff;text-decoration:none;border-radius:999px;padding:12px 20px;font-weight:700;">${safeLabel}</a></p>`;
}

function renderWishlistInvite(data: EmailTemplateDataMap["wishlist-invite"]): RenderedEmail {
  const inviterName = assertStringField(data, "inviterName", "wishlist-invite");
  const ownerName = assertStringField(data, "ownerName", "wishlist-invite");
  const inviteUrl = assertStringField(data, "inviteUrl", "wishlist-invite");
  const subject = templateSubjects["wishlist-invite"];
  const explanation = `${inviterName} har invitert deg til å følge ønskelisten til ${ownerName}.`;

  return {
    subject,
    html: renderLayout(`
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${escapeHtml(explanation)}</p>
      <p style="font-size:16px;line-height:1.6;margin:0;">Trykk på knappen under for å åpne invitasjonen.</p>
      ${renderButton(inviteUrl, "Åpne ønskeliste")}
      <p style="font-size:14px;line-height:1.6;margin:0;color:#6f665d;">Hvis knappen ikke virker, kan du kopiere denne lenken: <br /><a href="${escapeHtml(inviteUrl)}" style="color:#7c5f45;">${escapeHtml(inviteUrl)}</a></p>
    `),
    text: [
      subject,
      "",
      explanation,
      "",
      "Åpne ønskeliste:",
      inviteUrl,
    ].join("\n"),
    link: inviteUrl,
  };
}

function renderPasswordReset(data: EmailTemplateDataMap["password-reset"]): RenderedEmail {
  const resetUrl = assertStringField(data, "resetUrl", "password-reset");
  const subject = templateSubjects["password-reset"];

  return {
    subject,
    html: renderLayout(`
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">Vi har mottatt en forespørsel om å tilbakestille passordet ditt.</p>
      ${renderButton(resetUrl, "Tilbakestill passord")}
    `),
    text: [subject, "", "Tilbakestill passord:", resetUrl].join("\n"),
    link: resetUrl,
  };
}

function renderEmailVerification(
  data: EmailTemplateDataMap["email-verification"],
): RenderedEmail {
  const verificationUrl = assertStringField(
    data,
    "verificationUrl",
    "email-verification",
  );
  const subject = templateSubjects["email-verification"];

  return {
    subject,
    html: renderLayout(`
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">Bekreft e-postadressen din for å fullføre kontoen din.</p>
      ${renderButton(verificationUrl, "Bekreft e-post")}
    `),
    text: [subject, "", "Bekreft e-post:", verificationUrl].join("\n"),
    link: verificationUrl,
  };
}

function renderFamilyInvite(data: EmailTemplateDataMap["family-invite"]): RenderedEmail {
  const inviterName = assertStringField(data, "inviterName", "family-invite");
  const familyName = assertStringField(data, "familyName", "family-invite");
  const inviteUrl = assertStringField(data, "inviteUrl", "family-invite");
  const subject = templateSubjects["family-invite"];

  return {
    subject,
    html: renderLayout(`
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${escapeHtml(subject)}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 12px;">${escapeHtml(inviterName)} har invitert deg til familien ${escapeHtml(familyName)} i FamilieAppen.</p>
      ${renderButton(inviteUrl, "Åpne invitasjon")}
    `),
    text: [
      subject,
      "",
      `${inviterName} har invitert deg til familien ${familyName} i FamilieAppen.`,
      "",
      "Åpne invitasjon:",
      inviteUrl,
    ].join("\n"),
    link: inviteUrl,
  };
}

export function renderEmailTemplate<TTemplate extends EmailTemplate>(
  template: TTemplate,
  data: EmailTemplateDataMap[TTemplate],
): RenderedEmail {
  switch (template) {
    case "wishlist-invite":
      return renderWishlistInvite(data as EmailTemplateDataMap["wishlist-invite"]);
    case "password-reset":
      return renderPasswordReset(data as EmailTemplateDataMap["password-reset"]);
    case "email-verification":
      return renderEmailVerification(
        data as EmailTemplateDataMap["email-verification"],
      );
    case "family-invite":
      return renderFamilyInvite(data as EmailTemplateDataMap["family-invite"]);
    default:
      throw new Error(`Unsupported email template: ${String(template)}`);
  }
}
