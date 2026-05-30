import Link from "next/link";
import { Card, PageContainer } from "../../components/ui";

export default function ForgotPasswordPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="forgot-password-title">
        <div className="brand" aria-label="FamilieAppen">
          <p className="brand__name">Familie<span className="brand__mark">Appen</span></p>
          <p className="brand__tagline">Family logistics, kept simple.</p>
        </div>

        <Card className="auth-card" tone="default">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Password help</p>
            <h1 className="auth-card__title" id="forgot-password-title">Reset flow coming later.</h1>
            <p className="auth-card__description">
              This is a placeholder only. Password reset emails and authentication logic are not connected yet.
            </p>
          </div>

          <Link className="button button--primary" href="/login">Back to sign in</Link>
        </Card>
      </section>
    </PageContainer>
  );
}
