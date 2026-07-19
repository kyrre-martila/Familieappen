"use client";

import { PASSWORD_POLICY, getPasswordValidationMessage } from "@familieappen/shared/auth/password-policy";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Suspense, useMemo, useState } from "react";
import { LockIcon } from "../../components/LoginFormFields";
import { Button } from "../../components/ui";
import { resetPassword } from "../../lib/api";
import { getUserFacingApiMessage } from "../../lib/auth-family";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    const passwordPolicyError = getPasswordValidationMessage(password);
    if (passwordPolicyError) {
      setError(passwordPolicyError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passordene er ikke like.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({ token, password });
      setMessage(response.message);
      window.setTimeout(() => router.push("/login"), 1800);
    } catch (submitError) {
      setError(getUserFacingApiMessage(submitError, "Lenken er ugyldig eller utløpt. Be om en ny lenke."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-screen" aria-labelledby="reset-password-title">
      <Image alt="" aria-hidden="true" className="login-screen__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants" height={420} src="/assets/illustrations/plants.png" width={420} />

      <div className="login-screen__content">
        <Image alt="Familieappen" className="login-screen__logo" height={158} priority src="/assets/brand/familieappen-logo.svg" width={240} />

        <div className="login-screen__header">
          <h1 className="login-screen__title" id="reset-password-title">Lag nytt passord</h1>
          <p className="login-screen__subtitle">Velg et nytt passord for FamilieAppen-kontoen din.</p>
        </div>

        {!token ? <p className="form-message form-message--error" role="alert">Lenken mangler en gyldig kode. Be om en ny tilbakestillingslenke.</p> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field__label" htmlFor="reset-password-password">Nytt passord</label>
            <div className="login-field__control">
              <LockIcon />
              <input autoComplete="new-password" className="login-field__input" disabled={!token || isSubmitting || Boolean(message)} id="reset-password-password" minLength={PASSWORD_POLICY.minLength} name="password" placeholder={PASSWORD_POLICY.helperText} required type="password" />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field__label" htmlFor="reset-password-confirm">Gjenta nytt passord</label>
            <div className="login-field__control">
              <LockIcon />
              <input autoComplete="new-password" className="login-field__input" disabled={!token || isSubmitting || Boolean(message)} id="reset-password-confirm" minLength={PASSWORD_POLICY.minLength} name="confirmPassword" placeholder="Gjenta passordet" required type="password" />
            </div>
          </div>

          {message ? <p className="form-message form-message--success" role="status">{message}</p> : null}
          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

          <Button disabled={!token || isSubmitting || Boolean(message)} type="submit" variant="primary">
            {isSubmitting ? "Oppdaterer…" : "Oppdater passord"}
          </Button>
        </form>

        <Link className="login-screen__back-link" href="/login">← Tilbake til innlogging</Link>
      </div>
    </section>
  );
}

function ResetPasswordShell() {
  return (
    <section className="login-screen" aria-labelledby="reset-password-title-loading">
      <Image alt="" aria-hidden="true" className="login-screen__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants" height={420} src="/assets/illustrations/plants.png" width={420} />
      <div className="login-screen__content">
        <Image alt="Familieappen" className="login-screen__logo" height={158} priority src="/assets/brand/familieappen-logo.svg" width={240} />
        <div className="login-screen__header">
          <h1 className="login-screen__title" id="reset-password-title-loading">Lag nytt passord</h1>
          <p className="login-screen__subtitle">Laster trygg tilbakestilling…</p>
        </div>
      </div>
    </section>
  );
}
