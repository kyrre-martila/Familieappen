import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="settings-shell settings-shell--detail legal-placeholder" aria-labelledby="privacy-title">
      <Link className="settings-back-link" href="/settings/about" aria-label="Tilbake til App-info">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <h1 id="privacy-title">Personvern</h1>
        <p>En rolig oversikt over hvordan FamilieAppen behandler data.</p>
      </header>
      <section className="settings-placeholder-card" aria-label="Personvern">
        <p>Full personvernerklæring publiseres før lansering.</p>
      </section>
      <footer className="settings-footer">
        <Link href="/settings/about">Tilbake til App-info</Link>
      </footer>
    </main>
  );
}
