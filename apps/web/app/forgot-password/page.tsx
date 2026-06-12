"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { MailIcon } from "../../components/LoginFormFields";
import { Button } from "../../components/ui";
import { forgotPassword } from "../../lib/api";
import { getUserFacingApiMessage } from "../../lib/auth-family";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email });
      setMessage(response.message);
    } catch (submitError) {
      setError(getUserFacingApiMessage(submitError, "Vi klarte ikke å sende lenken akkurat nå. Prøv igjen om litt."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-screen" aria-labelledby="forgot-password-title">
      <Image alt="" aria-hidden="true" className="login-screen__light" height={492} priority src="/assets/illustrations/light-shadow.png" width={492} />
      <Image alt="" aria-hidden="true" className="login-screen__plants" height={420} src="/assets/illustrations/plants.png" width={420} />

      <div className="login-screen__content">
        <Image alt="Familieappen" className="login-screen__logo" height={158} priority src="/assets/brand/familieappen-logo.svg" width={240} />

        <div className="login-screen__header">
          <h1 className="login-screen__title" id="forgot-password-title">Glemt passord?</h1>
          <p className="login-screen__subtitle">
            Skriv inn e-postadressen din, så sender vi deg en trygg lenke for å lage et nytt passord.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field__label" htmlFor="forgot-password-email">E-postadresse</label>
            <div className="login-field__control">
              <MailIcon />
              <input autoComplete="email" className="login-field__input" id="forgot-password-email" name="email" placeholder="Skriv inn e-postadressen din" required type="email" />
            </div>
          </div>

          {message ? <p className="form-message form-message--success" role="status">{message}</p> : null}
          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

          <Button disabled={isSubmitting} type="submit" variant="primary">
            {isSubmitting ? "Sender…" : "Send tilbakestillingslenke"}
          </Button>
        </form>

        <Link className="login-screen__back-link" href="/login">← Tilbake til innlogging</Link>
      </div>
    </section>
  );
}
