"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "../../../../components/AppShell";
import { PageContainer } from "../../../../components/ui";
import { acceptWishlistInvite, declineWishlistInvite, getWishlistInvitePreview, type WishlistInvitePreview } from "../../../../lib/api";
import { getAccessToken } from "../../../../lib/session";

export function WishlistInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<WishlistInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const isLoggedIn = Boolean(getAccessToken());
  const returnUrl = `/wishlist/invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    void getWishlistInvitePreview(token)
      .then(setPreview)
      .catch(() => setMessage("Invitasjonen er ikke tilgjengelig."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setMessage(null);
    try {
      await acceptWishlistInvite(token);
      window.sessionStorage.setItem("familieappen:wishlist:toast", "Ønskelisten er lagt til i Delt med meg.");
      router.push("/wishlist?tab=shared");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke legge til ønskelisten.");
    }
  }

  async function handleDecline() {
    setMessage(null);
    try {
      await declineWishlistInvite(token);
      setMessage("Helt i orden. Invitasjonen er ikke lagt til.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke oppdatere invitasjonen.");
    }
  }

  return (
    <AppShell title="Ønskelisteinvitasjon">
      <PageContainer>
        <section className="wishlist-invite-page">
          {loading ? <p>Laster invitasjon …</p> : null}
          {!loading && !preview ? <p>{message ?? "Invitasjonen er ikke tilgjengelig."}</p> : null}
          {preview && !isLoggedIn ? (
            <>
              <h1>Du er invitert til en ønskeliste</h1>
              <p>Logg inn eller opprett konto for å legge til listen.</p>
              <div className="wishlist-invite-page__actions">
                <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}>Logg inn</Link>
                <Link href={`/register?returnUrl=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(preview.invitedEmail)}`}>Opprett konto</Link>
              </div>
              <p className="wishlist-invite-page__note">Invitasjonen er sendt til {preview.invitedEmail}. TODO: Bruk e-post som forhåndsutfylling hvis auth-flyten utvides.</p>
            </>
          ) : null}
          {preview && isLoggedIn ? (
            <>
              <h1>Vil du legge til {preview.ownerName} sin ønskeliste?</h1>
              <p>{preview.inviterName} har invitert deg til å følge denne ønskelisten.</p>
              <div className="wishlist-invite-page__actions">
                <button type="button" onClick={() => void handleDecline()}>Ikke nå</button>
                <button type="button" onClick={() => void handleAccept()}>Legg til</button>
              </div>
              {message ? <p className="wishlist-invite-page__note" role="status">{message}</p> : null}
            </>
          ) : null}
        </section>
      </PageContainer>
    </AppShell>
  );
}
