import { AddMembersForm } from "../../../components/AddMembersForm";
import { OnboardingProgress } from "../../../components/OnboardingProgress";
import { Card, PageContainer } from "../../../components/ui";

export default function AddMembersPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="add-members-title">
        <OnboardingProgress currentStep="members" />
        <Card className="auth-card" tone="default">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Add members</p>
            <h1 className="auth-card__title onboarding-hero-title" id="add-members-title">Who should be on the family overview?</h1>
            <p className="auth-card__description">Keep it simple for now. Add parents and children, then continue.</p>
          </div>

          <AddMembersForm />
        </Card>
      </section>
    </PageContainer>
  );
}
