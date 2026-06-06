import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="settings-shell settings-shell--detail legal-placeholder" aria-labelledby="terms-title">
      <Link className="settings-back-link" href="/settings/about" aria-label="Tilbake til App-info">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <h1 id="terms-title">Vilkår</h1>
        <p>En enkel oversikt over vilkårene for FamilieAppen.</p>
      </header>
      <section className="settings-placeholder-card" aria-label="Vilkår">
        <p>Fullstendige vilkår publiseres før lansering.</p>
      </section>
      <footer className="settings-footer">
        <Link href="/settings/about">Tilbake til App-info</Link>
      </footer>
    </main>
  );
}
