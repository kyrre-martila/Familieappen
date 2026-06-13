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
        <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
          <div>
            <strong>Hva lagrer vi?</strong>
            <p>
              FamilieAppen lagrer informasjon du selv legger inn, som kalenderhendelser,
              husk, middager, handlelister, ønskelister og familiemedlemmer.
            </p>
          </div>

          <div>
            <strong>Hvorfor lagrer vi det?</strong>
            <p>
              Data brukes for å gjøre appen nyttig for familien din og synkronisere
              innhold mellom familiemedlemmer.
            </p>
          </div>

          <div>
            <strong>Kalender og abonnement</strong>
            <p>
              Hvis du bruker kalenderimport eller privat kalenderlenke (ICS), deles
              kun det som er nødvendig for å vise hendelser i kalenderklienter som
              Apple Kalender eller Google Kalender.
            </p>
          </div>

          <div>
            <strong>Hvem kan se data?</strong>
            <p>
              Innhold deles kun med medlemmer i familien din. Private kalenderlenker
              bør behandles som hemmelige og kun deles med personer du stoler på.
            </p>
          </div>

          <div>
            <strong>E-post og varsler</strong>
            <p>
              FamilieAppen kan sende e-post knyttet til innlogging, sikkerhet og
              viktige varsler. Du kan selv styre varsler i appen.
            </p>
          </div>

          <div>
            <strong>Endringer</strong>
            <p>
              Dette er en forenklet personvernoversikt under utvikling. Full
              personvernerklæring publiseres før lansering.
            </p>
          </div>
        </div>
      </section>

      <footer className="settings-footer">
        <Link href="/settings/about">Tilbake til App-info</Link>
      </footer>
    </main>
  );
}