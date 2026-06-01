import Image from "next/image";
import { InvitationAcceptedResume } from "./InvitationAcceptedResume";

interface InvitationAcceptedPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationAcceptedPage({ params }: InvitationAcceptedPageProps) {
  const { token } = await params;

  return (
    <section className="invitation-status" aria-labelledby="invitation-accepted-title">
      <InvitationStatusChrome />
      <article className="invitation-status__card">
        <div className="invitation-status__spinner" aria-hidden="true" />
        <h1 className="invitation-status__title" id="invitation-accepted-title">Fortsetter invitasjonen</h1>
        <InvitationAcceptedResume token={token} />
      </article>
    </section>
  );
}

function InvitationStatusChrome() {
  return (
    <>
      <Image alt="" aria-hidden="true" className="login-screen__light invitation-status__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants invitation-status__plants" height={420} src="/assets/illustrations/plants.png" width={420} />
      <Image alt="FamilieAppen" className="invitation-status__logo" height={259} priority src="/assets/brand/familieappen-logo.svg" width={1575} />
    </>
  );
}
