import Image from "next/image";
import Link from "next/link";
import { FamilyMembersOnboarding } from "../../../components/FamilyMembersOnboarding";

export default function FamilyMembersPage() {
  return (
    <section className="login-screen family-members-screen" aria-labelledby="family-members-title">
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__light"
        height={492}
        priority
        src="/assets/illustrations/light-shadow.png"
        width={492}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__plants"
        height={420}
        src="/assets/illustrations/plants.png"
        width={420}
      />

      <Link className="onboarding-create-family-screen__back" href="/onboarding/create-family" aria-label="Tilbake til opprett familie">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m15 5-7 7 7 7" />
        </svg>
        <span className="sr-only">Tilbake</span>
      </Link>

      <div className="login-screen__content family-members-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo family-members-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header family-members-screen__header">
          <h1 className="login-screen__title" id="family-members-title">Inviter familien din</h1>
          <p className="login-screen__subtitle">Legg til familiemedlemmer nå, eller gjør det senere.</p>
        </div>

        <FamilyMembersOnboarding />
      </div>
    </section>
  );
}
