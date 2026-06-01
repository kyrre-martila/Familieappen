import Image from "next/image";
import { OnboardingRouteGuard } from "../../../components/OnboardingRouteGuard";
import { AppRecommendationActions } from "./AppRecommendationActions";

export default function AppRecommendationPage() {
  return (
    <>
      <OnboardingRouteGuard mode="app-recommendation" />
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
    </>
  );
}

function AppPreviewIllustration() {
  return (
    <div className="app-preview-illustration">
      <Image
        alt="Illustrasjon av FamilieAppen med varsler, kalender, handleliste og oppgaver"
        className="app-preview-illustration__image"
        height={512}
        priority
        sizes="(max-width: 32rem) 88vw, 32rem"
        src="/assets/illustrations/app-preview.png"
        width={590}
      />
    </div>
  );
}
