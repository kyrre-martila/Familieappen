import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface SettingsPlaceholderPageProps {
  description: string;
  title: string;
}

export function SettingsPlaceholderPage({ description, title }: SettingsPlaceholderPageProps) {
  return (
    <main className="settings-shell settings-shell--detail" aria-labelledby="settings-detail-title">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <h1 id="settings-detail-title">{title}</h1>
        <p>{description}</p>
      </header>
      <section className="settings-placeholder-card" aria-label={`${title} kommer snart`}>
        <p>Kommer i neste steg</p>
      </section>
    </main>
  );
}
