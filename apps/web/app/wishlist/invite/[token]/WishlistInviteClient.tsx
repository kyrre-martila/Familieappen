"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "../../../../components/AppShell";
import { PageContainer } from "../../../../components/ui";
import { acceptWishlistInvite, declineWishlistInvite, getWishlistInvitePreview, type WishlistInvitePreview } from "../../../../lib/api";
import { savePendingWishlistInvite } from "../../../../lib/pending-wishlist-invite";
import { getAccessToken } from "../../../../lib/session";

export function WishlistInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<WishlistInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const isLoggedIn = Boolean(getAccessToken());
  const returnUrl = `/wishlist/invite/${encodeURIComponent(token)}`;
  const previewUnavailableMessage = preview ? getUnavailableInviteMessage(preview.status) : null;
  const canRespond = preview?.status === "pending";

  useEffect(() => {
    void getWishlistInvitePreview(token)
      .then((nextPreview) => {
        setPreview(nextPreview);
        setMessage(getUnavailableInviteMessage(nextPreview.status));

        if (nextPreview.status === "pending") {
          savePendingWishlistInvite(token);
        }
      })
      .catch(() => setMessage("Invitasjonen er utløpt eller ikke lenger tilgjengelig."))
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
      const updated = await declineWishlistInvite(token);
      setPreview((currentPreview) => currentPreview ? { ...currentPreview, status: updated.status } : currentPreview);
      setMessage("Helt i orden. Invitasjonen er ikke lagt til.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kunne ikke oppdatere invitasjonen.");
    }
  }

  return (
    <AppShell title="Ønskelisteinvitasjon">
      <PageContainer>
        <section className="wishlist-invite-page">
          {loading ? <p role="status">Laster invitasjon …</p> : null}
          {!loading && !preview ? <p>{message ?? "Invitasjonen er ikke tilgjengelig."}</p> : null}
          {preview && !canRespond ? (
            <>
              <h1>Invitasjonen er ikke tilgjengelig</h1>
              <p>{previewUnavailableMessage ?? "Denne invitasjonen kan ikke brukes lenger."}</p>
              <Link className="wishlist-invite-page__secondary-link" href="/wishlist?tab=shared">Gå til Delt med meg</Link>
            </>
          ) : null}
          {preview && canRespond && !isLoggedIn ? (
            <>
              <h1>Du er invitert til en ønskeliste</h1>
              <p>Logg inn eller opprett konto for å legge til listen. Innholdet vises først etter innlogging.</p>
              <div className="wishlist-invite-page__actions">
                <Link href={`/login?next=${encodeURIComponent(returnUrl)}`}>Logg inn</Link>
                <Link href={`/register?next=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(preview.invitedEmail)}`}>Opprett konto</Link>
              </div>
              <p className="wishlist-invite-page__note">Invitasjonen er sendt til {preview.invitedEmail}.</p>
            </>
          ) : null}
          {preview && canRespond && isLoggedIn ? (
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

function getUnavailableInviteMessage(status: WishlistInvitePreview["status"]): string | null {
  switch (status) {
    case "accepted":
      return "Denne ønskelisten er allerede lagt til.";
    case "declined":
      return "Invitasjonen ble avslått.";
    case "removed":
      return "Ønskelisten er fjernet fra Delt med meg.";
    case "revoked":
      return "Tilgangen er fjernet av den som delte ønskelisten.";
    case "pending":
      return null;
  }
}
