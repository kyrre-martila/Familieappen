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
        <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
          <div>
            <strong>Bruk av appen</strong>
            <p>
              FamilieAppen er laget for å hjelpe familier med planlegging,
              kalender, husk, middager, handlelister og ønskelister.
            </p>
          </div>

          <div>
            <strong>Familier og deling</strong>
            <p>
              Innhold du legger inn kan deles med medlemmer i familien du er en del av.
              Administratorer i familien kan invitere eller godkjenne nye medlemmer.
            </p>
          </div>

          <div>
            <strong>Kalenderimport og abonnement</strong>
            <p>
              Kalenderimport (ICS) og private kalenderlenker brukes på eget ansvar.
              Del aldri private kalenderlenker offentlig, siden de kan gi innsyn i
              familiens hendelser.
            </p>
          </div>

          <div>
            <strong>Brukeransvar</strong>
            <p>
              Du er ansvarlig for informasjon du legger inn og hvem du velger å dele
              familieinnhold med.
            </p>
          </div>

          <div>
            <strong>Endringer og tilgjengelighet</strong>
            <p>
              FamilieAppen er under utvikling. Funksjoner kan endres, forbedres eller
              fjernes underveis for å gjøre appen bedre.
            </p>
          </div>

          <div>
            <strong>Endringer i vilkår</strong>
            <p>
              Dette er en forenklet oversikt under utvikling. Fullstendige vilkår
              publiseres før lansering.
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