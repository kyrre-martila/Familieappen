interface OnboardingProgressProps {
  currentStep: "account" | "family" | "members";
}

const steps = [
  { id: "account", label: "Account" },
  { id: "family", label: "Family" },
  { id: "members", label: "Members" }
] as const;

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <ol className="onboarding-progress" aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const className = [
          "onboarding-progress__step",
          isComplete ? "onboarding-progress__step--complete" : "",
          isCurrent ? "onboarding-progress__step--current" : ""
        ].filter(Boolean).join(" ");

        return (
          <li className={className} key={step.id}>
            <span className="onboarding-progress__dot" aria-hidden="true" />
            <span className="onboarding-progress__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
