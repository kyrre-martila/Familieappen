import Link from "next/link";
import { Card, PageContainer } from "../../components/ui";
import { OnboardingProgress } from "../../components/OnboardingProgress";

export default function OnboardingPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="onboarding-title">
        <OnboardingProgress currentStep="account" />
        <Card className="auth-card" tone="warm">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Quick setup</p>
            <h1 className="auth-card__title onboarding-hero-title" id="onboarding-title">Two small steps, then your dashboard.</h1>
            <p className="auth-card__description">
              Add your family name and a few people at home so FamilieAppen feels useful immediately.
            </p>
          </div>
          <Link className="button button--primary" href="/onboarding/create-family">Start setup</Link>
        </Card>
      </section>
    </PageContainer>
  );
}
