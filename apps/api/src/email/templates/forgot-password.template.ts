import { baseEmailTemplate, buildTextEmail, EmailRenderResult, escapeHtml } from "./base.template";
import { EmailButton } from "./partials/button";
import { EmailInfoBox } from "./partials/info-box";

export type ForgotPasswordTemplateData = {
  resetUrl: string;
  expiresInMinutes?: number;
};

export function forgotPasswordTemplate(data: ForgotPasswordTemplateData): EmailRenderResult {
  const expiresInMinutes = data.expiresInMinutes ?? 30;
  const subject = "Tilbakestill passordet ditt i FamilieAppen";
  const intro = "Vi har mottatt en forespørsel om å tilbakestille passordet ditt. Trykk på knappen under for å velge et nytt passord.";

  return {
    subject,
    previewText: "Velg et nytt passord for FamilieAppen. Lenken varer i 30 minutter.",
    link: data.resetUrl,
    html: baseEmailTemplate({
      previewText: "Velg et nytt passord for FamilieAppen. Lenken varer i 30 minutter.",
      icon: "🔒",
      headline: "Tilbakestill passordet ditt",
      intro: escapeHtml(intro),
      ctaHtml: EmailButton({ href: data.resetUrl, label: "Lag nytt passord" }),
      infoBoxHtml: EmailInfoBox({
        title: `Lenken varer i ${expiresInMinutes} minutter`,
        text: "Hvis du ikke ba om dette, kan du trygt ignorere e-posten. Passordet ditt blir ikke endret."
      }),
      footerNote: "Denne e-posten ble sendt fordi noen ba om nytt passord til en FamilieAppen-konto."
    }),
    text: buildTextEmail([
      subject,
      intro,
      `Lag nytt passord: ${data.resetUrl}`,
      `Lenken varer i ${expiresInMinutes} minutter.`,
      "Hvis du ikke ba om dette, kan du trygt ignorere e-posten."
    ])
  };
}
