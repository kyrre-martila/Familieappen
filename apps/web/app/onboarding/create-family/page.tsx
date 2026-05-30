import { CreateFamilyForm } from "../../../components/CreateFamilyForm";
import { OnboardingProgress } from "../../../components/OnboardingProgress";
import { Card, PageContainer } from "../../../components/ui";

export default function CreateFamilyPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="create-family-title">
        <OnboardingProgress currentStep="family" />
        <Card className="auth-card" tone="default">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Create family</p>
            <h1 className="auth-card__title" id="create-family-title">What should we call your home?</h1>
            <p className="auth-card__description">Examples: “The Hansen Family” or “Hjemme hos Martila”.</p>
          </div>

          <CreateFamilyForm />
        </Card>
      </section>
    </PageContainer>
  );
}
