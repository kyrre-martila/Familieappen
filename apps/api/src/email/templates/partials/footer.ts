function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function EmailFooter({ note }: { note?: string } = {}): string {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM_ADDRESS?.trim();
  const supportLine = supportEmail ? `<br>Trenger du hjelp? Svar på denne e-posten eller kontakt ${escapeHtml(supportEmail)}.` : "";

  return `<p style="margin:0;color:#6c7b76;font-size:12px;line-height:1.6;text-align:center;">${escapeHtml(note || "FamilieAppen hjelper familien å holde oversikt sammen.")}${supportLine}</p>`;
}
