import { baseEmailTemplate, buildTextEmail, EmailRenderResult, escapeHtml } from "./base.template";
import { EmailButton } from "./partials/button";
import { EmailInfoBox } from "./partials/info-box";

export type WishlistInviteTemplateData = {
  inviterName: string;
  ownerName?: string;
  inviteUrl: string;
};

export function wishlistInviteTemplate(data: WishlistInviteTemplateData): EmailRenderResult {
  const subject = "Du er invitert til en ønskeliste";
  const ownerName = data.ownerName || "et familiemedlem";
  const intro = `${data.inviterName} har delt ønskelisten til ${ownerName} med deg.`;

  return {
    subject,
    previewText: `${data.inviterName} har delt en ønskeliste med deg.`,
    link: data.inviteUrl,
    html: baseEmailTemplate({
      previewText: `${data.inviterName} har delt en ønskeliste med deg.`,
      icon: "🎁",
      headline: "En ønskeliste er delt med deg",
      intro: `${escapeHtml(data.inviterName)} har invitert deg til å følge ønskelisten til <strong style="color:#2f7460;">${escapeHtml(ownerName)}</strong>.`,
      body: "Åpne invitasjonen for å se ønsker og holde oversikt sammen med familien.",
      ctaHtml: EmailButton({ href: data.inviteUrl, label: "Åpne ønskeliste" }),
      infoBoxHtml: EmailInfoBox({
        title: "Trygg deling",
        text: "Invitasjonen kan bare brukes av e-postadressen den ble sendt til."
      })
    }),
    text: buildTextEmail([subject, intro, "Åpne ønskeliste:", data.inviteUrl, "Logg inn eller opprett konto for å se listen."])
  };
}
