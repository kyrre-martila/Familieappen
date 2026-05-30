import Link from "next/link";
import { AuthForm } from "../../components/AuthForm";
import { Card, PageContainer } from "../../components/ui";

export default function LoginPage() {
  return (
    <PageContainer tone="auth">
      <section className="auth-page" aria-labelledby="login-title">
        <div className="brand" aria-label="FamilieAppen">
          <p className="brand__name">Familie<span className="brand__mark">Appen</span></p>
          <p className="brand__tagline">A calmer way to run the week.</p>
        </div>

        <Card className="auth-card" tone="default">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Sign in</p>
            <h1 className="auth-card__title" id="login-title">Welcome back.</h1>
            <p className="auth-card__description">Use your email and password to open your family dashboard.</p>
          </div>

          <AuthForm submitLabel="Sign in" submitTo="/dashboard">
            <label className="form-field">
              <span className="form-field__label">Email</span>
              <input className="form-field__input" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="form-field">
              <span className="form-field__label">Password</span>
              <input className="form-field__input" name="password" type="password" autoComplete="current-password" required />
            </label>
          </AuthForm>

          <div className="auth-links">
            <Link className="auth-links__link" href="/forgot-password">Forgot password?</Link>
            <Link className="button button--secondary" href="/register">Create account</Link>
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}
