import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="settings-shell settings-shell--detail legal-placeholder" aria-labelledby="privacy-title">
      <header className="settings-hero settings-hero--detail">
        <h1 id="privacy-title">Personvern</h1>
        <p>Personvernerklæring kommer her.</p>
      </header>
      <section className="settings-placeholder-card" aria-label="Personvern kommer snart">
        <p>Personvern kommer her.</p>
      </section>
      <footer className="settings-footer">
        <Link href="/settings/about">Tilbake til App-info</Link>
      </footer>
    </main>
  );
}
