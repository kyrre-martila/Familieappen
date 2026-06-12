function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function EmailInfoBox({ title, text }: { title: string; text: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f4faf7;border:1px solid #dbe9e2;border-radius:18px;">
    <tr>
      <td style="padding:16px 18px;">
        <p style="margin:0 0 5px 0;color:#2d5549;font-size:14px;font-weight:800;">${escapeHtml(title)}</p>
        <p style="margin:0;color:#5c6f68;font-size:13px;line-height:1.55;">${escapeHtml(text)}</p>
      </td>
    </tr>
  </table>`;
}
