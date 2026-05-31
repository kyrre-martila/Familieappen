import Image from "next/image";
import Link from "next/link";
import { ProfileOnboardingForm } from "./ProfileOnboardingForm";

export default function ProfileOnboardingPage() {
  return (
    <section className="login-screen onboarding-profile-screen" aria-labelledby="profile-onboarding-title">
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

      <Link className="onboarding-profile-screen__back" href="/register" aria-label="Tilbake til registrering">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m15 5-7 7 7 7" />
        </svg>
        <span>Tilbake</span>
      </Link>

      <div className="login-screen__content onboarding-profile-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo onboarding-profile-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header onboarding-profile-screen__header">
          <h1 className="login-screen__title" id="profile-onboarding-title">Fortell litt om deg selv</h1>
        </div>

        <ProfileOnboardingForm />
      </div>
    </section>
  );
}
