import Image from "next/image";
import { MOCK_INVITATION_CONTEXT } from "../../../../lib/invitation-context";
import { InvitationDeclineActions } from "./InvitationDeclineActions";

interface InvitationDeclinePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationDeclinePage({ params }: InvitationDeclinePageProps) {
  const { token } = await params;
  const invitation = { token, ...MOCK_INVITATION_CONTEXT };

  return (
    <section className="invitation-status" aria-labelledby="invitation-decline-title">
      <Image alt="" aria-hidden="true" className="login-screen__light invitation-status__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants invitation-status__plants" height={420} src="/assets/illustrations/plants.png" width={420} />
      <Image alt="FamilieAppen" className="invitation-status__logo" height={259} priority src="/assets/brand/familieappen-logo.svg" width={1575} />
      <article className="invitation-status__card">
        <h1 className="invitation-status__title" id="invitation-decline-title">Avslå invitasjon?</h1>
        <p className="invitation-status__description">Du kan ikke se familiens innhold hvis du avslår invitasjonen.</p>
        <InvitationDeclineActions familyName={invitation.familyName} inviterName={invitation.inviterName} token={token} />
      </article>
    </section>
  );
}
