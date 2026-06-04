import Link from "next/link";

import { Button, EmptyState } from "../../components/ui";

export function FamilyMembersEmptyState() {
  return (
    <div className="family-members-empty-state">
      <EmptyState
        title="Ingen familiemedlemmer ennå"
        description="Legg til familien for å velge deltakere og ansvarlige personer."
      />
      <Link className="button button--primary" href="/onboarding/add-members">
        Legg til familiemedlem
      </Link>
    </div>
  );
}

export function FamilyMembersErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="family-members-empty-state">
      <EmptyState title="Kunne ikke hente familie akkurat nå" description="Prøv igjen om litt." />
      <Button variant="secondary" onClick={onRetry}>
        Prøv igjen
      </Button>
    </div>
  );
}

export function FamilyMembersLoadingState() {
  return (
    <div className="family-members-empty-state">
      <EmptyState title="Henter familie" description="Et lite øyeblikk." />
    </div>
  );
}
