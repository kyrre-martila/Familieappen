"use client";

import { useRouter } from "next/navigation";
import { Button, Card, PageContainer } from "./ui";

export const PENDING_APPROVAL_TITLE = "Forespørsel sendt til familien";
export const PENDING_APPROVAL_BODY = "Du venter på godkjenning for å bli med i familien.";
export const PENDING_APPROVAL_HELP = "Når du blir godkjent får du tilgang til handlelister, kalender og oppgaver.";
export const LOCKED_FEATURE_TITLE = "Venter på godkjenning";
export const LOCKED_FEATURE_BODY = "Du får tilgang til denne funksjonen når familien godkjenner forespørselen din.";

export function PendingApprovalBanner() {
  return (
    <article className="pending-approval-card" aria-labelledby="pending-approval-title">
      <div className="pending-approval-card__icon" aria-hidden="true">
        <HourglassIcon />
      </div>
      <div className="pending-approval-card__copy">
        <h1 className="pending-approval-card__title" id="pending-approval-title">
          {PENDING_APPROVAL_TITLE}
        </h1>
        <p className="pending-approval-card__body">{PENDING_APPROVAL_BODY}</p>
        <p className="pending-approval-card__body pending-approval-card__body--secondary">{PENDING_APPROVAL_HELP}</p>
      </div>
    </article>
  );
}

export function PendingDashboard() {
  return (
    <PageContainer tone="dashboard">
      <section className="pending-home" aria-label="Venter på familiegodkjenning">
        <div className="pending-home__topbar" aria-label="FamilieAppen">
          <div className="pending-home__brand">
            <span className="pending-home__logo" aria-hidden="true">F</span>
            <span className="pending-home__brand-name">FamilieAppen</span>
          </div>
          <div className="pending-home__profile" aria-label="Profil">EK</div>
        </div>
        <PendingApprovalBanner />
      </section>
    </PageContainer>
  );
}

export function LockedFeatureState() {
  const router = useRouter();

  return (
    <PageContainer>
      <Card className="locked-feature-card" tone="warm">
        <div className="locked-feature-card__icon" aria-hidden="true">
          <LockIcon />
        </div>
        <div className="locked-feature-card__copy">
          <h1 className="locked-feature-card__title">{LOCKED_FEATURE_TITLE}</h1>
          <p className="locked-feature-card__body">{LOCKED_FEATURE_BODY}</p>
        </div>
        <Button className="locked-feature-card__button" onClick={() => router.push("/dashboard")} variant="primary">
          OK
        </Button>
      </Card>
    </PageContainer>
  );
}

function HourglassIcon() {
  return (
    <svg fill="none" viewBox="0 0 48 48">
      <path d="M15 6h18M15 42h18M17 6v8.2c0 2.4 1.1 4.7 3 6.2l4 3.2 4-3.2a8 8 0 0 0 3-6.2V6M17 42v-8.2c0-2.4 1.1-4.7 3-6.2l4-3.2 4 3.2a8 8 0 0 1 3 6.2V42" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M20 16h8M20 35c1.6-2 3-3 4-3s2.4 1 4 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg fill="none" viewBox="0 0 48 48">
      <path d="M15 21v-5a9 9 0 0 1 18 0v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M13 21h22a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V24a3 3 0 0 1 3-3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" />
      <path d="M24 30v4" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
