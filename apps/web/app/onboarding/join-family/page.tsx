import Image from "next/image";
import Link from "next/link";
import { JoinFamilyCodeForm } from "./JoinFamilyCodeForm";

export default function JoinFamilyPage() {
  return (
    <section className="login-screen join-family-screen" aria-labelledby="join-family-title">
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

      <Link className="onboarding-profile-screen__back" href="/onboarding/family-start" aria-label="Tilbake til familievalg">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m15 5-7 7 7 7" />
        </svg>
        <span>Tilbake</span>
      </Link>

      <div className="login-screen__content join-family-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo join-family-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <JoinFamilyCodeForm />
      </div>
    </section>
  );
}
