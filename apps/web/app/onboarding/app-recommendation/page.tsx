import Image from "next/image";
import { AppRecommendationActions } from "./AppRecommendationActions";

const previewItems = [
  { label: "Kalender", meta: "2 hendelser i dag", detail: "18:00 Fotballtrening", icon: <CalendarPreviewIcon /> },
  { label: "Handleliste", meta: "6 varer", detail: null, icon: <ShoppingPreviewIcon /> },
  { label: "Oppgaver", meta: "3 oppgaver igjen", detail: null, icon: <TaskPreviewIcon /> },
];

export default function AppRecommendationPage() {
  return (
    <section className="login-screen app-recommendation-screen" aria-labelledby="app-recommendation-title">
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

      <div className="login-screen__content app-recommendation-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo app-recommendation-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header app-recommendation-screen__header">
          <h1 className="login-screen__title" id="app-recommendation-title">Familieappen er best i appen 💚</h1>
          <p className="login-screen__subtitle">Få full opplevelse med varsler, raskere tilgang og en enklere hverdag.</p>
        </div>

        <AppPreviewIllustration />
        <AppRecommendationActions />
      </div>
    </section>
  );
}

function AppPreviewIllustration() {
  return (
    <div className="app-preview-illustration" aria-label="Forhåndsvisning av FamilieAppen på mobil">
      <div className="app-preview-illustration__blob" />
      <div className="app-preview-illustration__cup" aria-hidden="true">
        <span />
      </div>
      <div className="app-preview-illustration__branch app-preview-illustration__branch--left" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="app-preview-illustration__branch app-preview-illustration__branch--right" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="app-preview-phone">
        <div className="app-preview-phone__notch" aria-hidden="true" />
        <p className="app-preview-phone__brand">FamilieAppen</p>
        <div className="app-preview-phone__cards">
          {previewItems.map((item) => (
            <article className="app-preview-card" key={item.label}>
              <span className="app-preview-card__icon" aria-hidden="true">{item.icon}</span>
              <span className="app-preview-card__copy">
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
                {item.detail ? <small>{item.detail}</small> : null}
              </span>
            </article>
          ))}
        </div>
      </div>
      <div className="app-preview-notification" aria-hidden="true">
        <BellIcon />
        <span>2</span>
      </div>
    </div>
  );
}

function CalendarPreviewIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M7 4.5v3" />
      <path d="M17 4.5v3" />
      <path d="M5.5 7h13v12h-13z" />
      <path d="M8.5 11h2" />
      <path d="M13.5 11h2" />
      <path d="M8.5 15h2" />
    </svg>
  );
}

function ShoppingPreviewIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M5 5h2l1.5 10h8.5l2-7H8" />
      <path d="M10 19.25h.01" />
      <path d="M17 19.25h.01" />
    </svg>
  );
}

function TaskPreviewIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
      <path d="m8.5 12.2 2.2 2.2 4.8-5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7-2.5 7h17S18 16.5 18 9.5Z" />
      <path d="M14 19a2.2 2.2 0 0 1-4 0" />
    </svg>
  );
}
