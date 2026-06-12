function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function EmailButton({ href, label }: { href: string; label: string }): string {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="display:inline-block;min-width:220px;background:#2f7460;color:#ffffff;text-decoration:none;border-radius:999px;padding:16px 26px;font-size:16px;line-height:1.2;font-weight:800;text-align:center;box-shadow:0 10px 22px rgba(47,116,96,0.24);">${escapeHtml(label)}</a>`;
}
