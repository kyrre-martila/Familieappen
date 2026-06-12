import { baseEmailTemplate, buildTextEmail, EmailRenderResult, escapeHtml } from "./base.template";
import { EmailButton } from "./partials/button";
import { EmailInfoBox } from "./partials/info-box";

export type FamilyInviteTemplateData = {
  inviterName: string;
  familyName?: string;
  inviteUrl: string;
};

export function familyInviteTemplate(data: FamilyInviteTemplateData): EmailRenderResult {
  const subject = "Du er invitert til en familie i FamilieAppen";
  const familyName = data.familyName || "familien";
  const intro = `${data.inviterName} har invitert deg til ${familyName} i FamilieAppen.`;

  return {
    subject,
    previewText: `${data.inviterName} har invitert deg til ${familyName}.`,
    link: data.inviteUrl,
    html: baseEmailTemplate({
      previewText: `${data.inviterName} har invitert deg til ${familyName}.`,
      icon: "👨‍👩‍👧‍👦",
      headline: "Bli med i familien",
      intro: `${escapeHtml(data.inviterName)} har invitert deg til <strong style="color:#2f7460;">${escapeHtml(familyName)}</strong> i FamilieAppen.`,
      body: "Her kan dere samle kalender, oppgaver, ønskelister og hverdagsplaner på ett rolig sted.",
      ctaHtml: EmailButton({ href: data.inviteUrl, label: "Åpne invitasjon" }),
      infoBoxHtml: EmailInfoBox({
        title: "Hva skjer videre?",
        text: "Logg inn eller opprett konto med e-postadressen som ble invitert for å bli med."
      })
    }),
    text: buildTextEmail([subject, intro, "Åpne invitasjon:", data.inviteUrl, "Logg inn eller opprett konto for å bli med."])
  };
}
