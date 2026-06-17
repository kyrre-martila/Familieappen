"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "../../../../components/AppShell";
import { Button, Card, EmptyState, LoadingState, PageContainer } from "../../../../components/ui";
import { getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../../../lib/auth-family";
import { acceptShoppingListInvite, ApiError, getShoppingListInvitePreview } from "../../../../lib/api";

type Preview = { listName: string; invitedEmail: string; inviterName: string; status: string };

export default function ShoppingInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    void getShoppingListInvitePreview(token)
      .then(setPreview)
      .catch((error) => setMessage(getUserFacingApiMessage(error, "Kunne ikke hente invitasjonen.")))
      .finally(() => setLoading(false));
  }, [token]);

  async function acceptInvite() {
    setAccepting(true);
    try {
      await acceptShoppingListInvite(token);
      router.push("/shopping");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleMissingOrInvalidAuth(error, router);
        return;
      }
      setMessage(getUserFacingApiMessage(error, "Kunne ikke akseptere invitasjonen."));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <AppShell title="Handlelisteinvitasjon">
      <PageContainer>
        {loading ? <LoadingState title="Laster invitasjon" description="Henter delt handleliste." /> : null}
        {!loading && preview ? (
          <Card tone="default">
            <EmptyState title={`${preview.inviterName} har delt ${preview.listName}`} description={`Invitasjonen er sendt til ${preview.invitedEmail}.`} />
            {message ? <p className="shopping-card__message">{message}</p> : null}
            <Button disabled={accepting || preview.status !== "pending"} onClick={acceptInvite}>{accepting ? "Aksepterer …" : "Aksepter invitasjon"}</Button>
          </Card>
        ) : null}
        {!loading && !preview ? <Card tone="default"><EmptyState title="Fant ikke invitasjonen" description={message || "Lenken er ugyldig eller utløpt."} /></Card> : null}
      </PageContainer>
    </AppShell>
  );
}
