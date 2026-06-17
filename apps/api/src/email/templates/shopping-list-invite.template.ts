import { baseEmailTemplate, buildTextEmail, EmailRenderResult, escapeHtml } from "./base.template";
import { EmailButton } from "./partials/button";
import { EmailInfoBox } from "./partials/info-box";

export type ShoppingListInviteTemplateData = { inviteUrl: string; inviterName: string; listName: string };

export function shoppingListInviteTemplate(data: ShoppingListInviteTemplateData): EmailRenderResult {
  const subject = "Du er invitert til en handleliste";
  return {
    subject,
    previewText: `${data.inviterName} har delt en handleliste med deg.`,
    link: data.inviteUrl,
    html: baseEmailTemplate({
      previewText: `${data.inviterName} har delt en handleliste med deg.`,
      icon: "🛒",
      headline: "En handleliste er delt med deg",
      intro: `${escapeHtml(data.inviterName)} har invitert deg til handlelisten <strong style="color:#2f7460;">${escapeHtml(data.listName)}</strong>.`,
      body: "Åpne invitasjonen for å handle sammen og oppdatere listen.",
      ctaHtml: EmailButton({ href: data.inviteUrl, label: "Åpne handleliste" }),
      infoBoxHtml: EmailInfoBox({ title: "Trygg deling", text: "Invitasjonen kan bare brukes av e-postadressen den ble sendt til." })
    }),
    text: buildTextEmail([subject, `${data.inviterName} har delt handlelisten ${data.listName} med deg.`, "Åpne invitasjonen:", data.inviteUrl])
  };
}
