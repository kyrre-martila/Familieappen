import Image from "next/image";
import Link from "next/link";
import { CreateFamilyForm } from "../../../components/CreateFamilyForm";

export default function CreateFamilyPage() {
  return (
    <section className="login-screen onboarding-create-family-screen" aria-labelledby="create-family-title">
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

      <Link className="onboarding-create-family-screen__back" href="/onboarding/family-start" aria-label="Tilbake til familiestart">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m15 5-7 7 7 7" />
        </svg>
        <span className="sr-only">Tilbake</span>
      </Link>

      <div className="login-screen__content onboarding-create-family-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo onboarding-create-family-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header onboarding-create-family-screen__header">
          <h1 className="login-screen__title" id="create-family-title">Opprett familien din</h1>
          <p className="login-screen__subtitle">Gi familien et navn og inviter medlemmer senere.</p>
        </div>

        <CreateFamilyForm />
      </div>
    </section>
  );
}
