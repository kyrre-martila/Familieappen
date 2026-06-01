import Image from "next/image";
import { PendingApprovalActions } from "./PendingApprovalActions";

export default function InvitationPendingApprovalPage() {
  return (
    <section className="invitation-status" aria-labelledby="invitation-pending-title">
      <Image alt="" aria-hidden="true" className="login-screen__light invitation-status__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants invitation-status__plants" height={420} src="/assets/illustrations/plants.png" width={420} />
      <Image alt="FamilieAppen" className="invitation-status__logo" height={259} priority src="/assets/brand/familieappen-logo.svg" width={1575} />
      <article className="invitation-status__card">
        <div className="invitation-status__icon" aria-hidden="true">⏳</div>
        <h1 className="invitation-status__title" id="invitation-pending-title">Venter på godkjenning</h1>
        <p className="invitation-status__description">Administrator må godkjenne forespørselen din før du får tilgang til familien.</p>
        <PendingApprovalActions />
      </article>
    </section>
  );
}
