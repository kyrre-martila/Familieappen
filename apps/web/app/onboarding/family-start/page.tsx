import Image from "next/image";
import Link from "next/link";
import { FamilyStartInviteGate } from "./FamilyStartInviteGate";

const familyStartChoices = [
  {
    cta: "Opprett familie",
    description: "Start en ny familie og inviter medlemmer senere.",
    href: "/onboarding/create-family",
    icon: <CreateFamilyIcon />,
    title: "Opprett ny familie",
  },
  {
    cta: "Bruk familiekode",
    description: "Bli med i en familie ved å skrive inn kode.",
    href: "/onboarding/join-family",
    icon: <JoinFamilyIcon />,
    title: "Jeg har familiekode",
  },
];

export default function FamilyStartPage() {
  return (
    <section className="login-screen onboarding-family-start-screen" aria-labelledby="family-start-title">
      <FamilyStartInviteGate />
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

      <Link className="onboarding-profile-screen__back" href="/onboarding/profile" aria-label="Tilbake til profil">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <path d="m15 5-7 7 7 7" />
        </svg>
        <span>Tilbake</span>
      </Link>

      <div className="login-screen__content onboarding-family-start-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo onboarding-family-start-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header onboarding-family-start-screen__header">
          <h1 className="login-screen__title" id="family-start-title">Hvordan vil du komme i gang?</h1>
          <p className="login-screen__subtitle">Opprett en ny familie eller bli med i en eksisterende.</p>
        </div>

        <div className="onboarding-family-start-screen__choices" aria-label="Velg hvordan du vil starte">
          {familyStartChoices.map((choice) => (
            <Link className="family-start-choice" href={choice.href} key={choice.href}>
              <span className="family-start-choice__icon" aria-hidden="true">{choice.icon}</span>
              <span className="family-start-choice__copy">
                <span className="family-start-choice__title">{choice.title}</span>
                <span className="family-start-choice__description">{choice.description}</span>
                <span className="family-start-choice__cta">{choice.cta}</span>
              </span>
              <span className="family-start-choice__arrow" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <div className="onboarding-family-start-screen__invite-note">
          <p>Har du fått invitasjonslenke?</p>
          <p>Åpne linken du fikk tilsendt.</p>
        </div>
      </div>
    </section>
  );
}

function CreateFamilyIcon() {
  return (
    <svg fill="none" viewBox="0 0 96 96">
      <path d="M19 44.5 48 20l29 24.5" />
      <path d="M27 42v32h42V42" />
      <path d="M42 74V58h12v16" />
      <path d="M39 47.5c0-4.5 5.6-6.7 9-2.7 3.4-4 9-1.8 9 2.7 0 5.5-9 10.5-9 10.5s-9-5-9-10.5Z" />
      <path d="M18.5 76c1.2-6.6 5.9-10.5 12.5-10.5s11.3 3.9 12.5 10.5" />
      <path d="M24.5 58.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      <path d="M52.5 76c1.2-6.6 5.9-10.5 12.5-10.5S76.3 69.4 77.5 76" />
      <path d="M58.5 58.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function JoinFamilyIcon() {
  return (
    <svg fill="none" viewBox="0 0 96 96">
      <path d="M23 38h50v38H23z" />
      <path d="m23 38 25 21 25-21" />
      <path d="M36 54.5 23 76" />
      <path d="m60 54.5 13 21.5" />
      <path d="M39.8 32.2 48 24l8.2 8.2" />
      <path d="M48 24v27" />
      <path d="M59 35.5h4.5a8.5 8.5 0 0 1 0 17H58" />
      <path d="M38 52.5h-5.5a8.5 8.5 0 0 1 0-17H37" />
      <path d="M40 44h16" />
      <path d="M62.5 68.5 66 72l7-8" />
    </svg>
  );
}
