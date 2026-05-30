import Link from "next/link";
import { AuthForm } from "../../components/AuthForm";
import { Card, PageContainer } from "../../components/ui";

export default function RegisterPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="register-title">
        <div className="brand" aria-label="FamilieAppen">
          <p className="brand__name">Familie<span className="brand__mark">Appen</span></p>
          <p className="brand__tagline">Simple family logistics from day one.</p>
        </div>

        <Card className="auth-card" tone="default">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Create account</p>
            <h1 className="auth-card__title" id="register-title">Start in under a minute.</h1>
            <p className="auth-card__description">No long setup. Add the basics now and adjust everything later.</p>
          </div>

          <AuthForm mode="register" submitLabel="Create account" submitTo="/onboarding/create-family">
            <label className="form-field">
              <span className="form-field__label">Name</span>
              <input className="form-field__input" name="name" type="text" autoComplete="name" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Email</span>
              <input className="form-field__input" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Password</span>
              <input className="form-field__input" name="password" type="password" autoComplete="new-password" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Confirm password</span>
              <input className="form-field__input" name="confirmPassword" type="password" autoComplete="new-password" required />
            </label>
          </AuthForm>

          <p className="auth-card__footnote">Already have an account? <Link href="/login">Sign in</Link></p>
        </Card>
      </section>
    </PageContainer>
  );
}
