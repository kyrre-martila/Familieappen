import Image from "next/image";
import { MOCK_INVITATION_CONTEXT } from "../../../../lib/invitation-context";
import { InvitationFamilySwitchActions } from "./InvitationFamilySwitchActions";

interface InvitationFamilySwitchPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationFamilySwitchPage({ params }: InvitationFamilySwitchPageProps) {
  const { token } = await params;
  const invitation = {
    token,
    ...MOCK_INVITATION_CONTEXT,
  };

  return (
    <section className="invitation-switch" aria-labelledby="invitation-switch-title">
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__light invitation-switch__light"
        height={492}
        priority
        src="/assets/illustrations/light-shadow.png"
        width={492}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__plants invitation-switch__plants"
        height={420}
        src="/assets/illustrations/plants.png"
        width={420}
      />

      <header className="invitation-switch__header" aria-label="FamilieAppen">
        <Image
          alt="FamilieAppen"
          className="invitation-switch__logo"
          height={259}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={1575}
        />
      </header>

      <main className="invitation-switch__content">
        <article className="invitation-switch__card">
          <div className="invitation-switch__icon" aria-hidden="true">
            <svg fill="none" viewBox="0 0 64 64">
              <path d="M14 28.5 32 13l18 15.5" />
              <path d="M19.5 27v22.5h25V27" />
              <path d="M27.5 49.5V38.5h9v11" />
              <path d="M24.5 32.5c0-3.6 4.5-5.3 7.5-2 3-3.3 7.5-1.6 7.5 2 0 4.7-7.5 8.7-7.5 8.7s-7.5-4-7.5-8.7Z" />
            </svg>
          </div>

          <div className="invitation-switch__copy">
            <h1 className="invitation-switch__title" id="invitation-switch-title">
              Du er allerede med i en familie
            </h1>
            <p className="invitation-switch__description">
              Du kan bare være aktiv i én familie om gangen. Hvis du godtar denne invitasjonen, må du bytte aktiv familie.
            </p>
          </div>

          <div className="invitation-switch__invite-note" aria-label="Invitasjonsdetaljer">
            <span>Invitasjonen gjelder:</span>
            <strong>{invitation.familyName}</strong>
          </div>

          <InvitationFamilySwitchActions
            familyName={invitation.familyName}
            inviterName={invitation.inviterName}
            token={invitation.token}
          />
        </article>
      </main>
    </section>
  );
}
