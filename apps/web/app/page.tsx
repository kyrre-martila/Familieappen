import Link from "next/link";
import { Card, PageContainer } from "../components/ui";

export default function WelcomePage() {
  return (
    <PageContainer tone="welcome">
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="brand brand--center" aria-label="FamilieAppen">
          <p className="brand__name">Familie<span className="brand__mark">Appen</span></p>
          <p className="brand__tagline">Family logistics, kept simple.</p>
        </div>

        <Card className="auth-card" tone="warm">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Welcome</p>
            <h1 className="auth-card__title" id="welcome-title">Let’s get your family organized.</h1>
            <p className="auth-card__description">
              Start with the smallest useful setup: your account, your family name, and who lives at home.
            </p>
          </div>

          <div className="auth-actions">
            <Link className="button button--primary" href="/register">Create account</Link>
            <Link className="button button--secondary" href="/login">Sign in</Link>
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}
