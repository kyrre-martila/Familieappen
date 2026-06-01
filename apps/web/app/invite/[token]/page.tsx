import Image from "next/image";
import { InvitationLandingActions } from "./InvitationLandingActions";
import { MOCK_INVITATION_CONTEXT } from "../../../lib/invitation-context";

interface InvitationLandingPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationLandingPage({ params }: InvitationLandingPageProps) {
  const { token } = await params;
  const invitation = {
    token,
    ...MOCK_INVITATION_CONTEXT,
  };

  return (
    <section className="invitation-landing" aria-labelledby="invitation-landing-title">
      <header className="invitation-landing__header" aria-label="FamilieAppen">
        <Image
          alt="FamilieAppen"
          className="invitation-landing__logo"
          height={259}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={1575}
        />
      </header>

      <main className="invitation-landing__content">
        <Image
          alt=""
          aria-hidden="true"
          className="invitation-landing__invite-illustration"
          height={512}
          priority
          src="/assets/illustrations/family-invite.png"
          width={491}
        />

        <div className="invitation-landing__copy">
          <h1 className="invitation-landing__title" id="invitation-landing-title">Du er invitert! 👋</h1>
          <p className="invitation-landing__inviter">{invitation.inviterName} har invitert deg til</p>
          <p className="invitation-landing__family-name">{invitation.familyName}</p>
          <p className="invitation-landing__description">
            Planlegg hverdagen sammen med handlelister, kalender, oppgaver og mer.
          </p>
        </div>

        <Image
          alt="En familie samlet foran grønne planter"
          className="invitation-landing__family-illustration"
          height={512}
          priority
          src="/assets/illustrations/family-hero.png"
          width={843}
        />
      </main>

      <InvitationLandingActions
        familyName={invitation.familyName}
        inviterName={invitation.inviterName}
        token={invitation.token}
      />
    </section>
  );
}
