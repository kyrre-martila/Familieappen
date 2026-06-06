import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="settings-shell settings-shell--detail legal-placeholder" aria-labelledby="terms-title">
      <header className="settings-hero settings-hero--detail">
        <h1 id="terms-title">Vilkår</h1>
        <p>Vilkår kommer her.</p>
      </header>
      <section className="settings-placeholder-card" aria-label="Vilkår kommer snart">
        <p>Vilkår kommer her.</p>
      </section>
      <footer className="settings-footer">
        <Link href="/settings/about">Tilbake til App-info</Link>
      </footer>
    </main>
  );
}
