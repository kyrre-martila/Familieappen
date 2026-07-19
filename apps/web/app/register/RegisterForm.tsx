"use client";

import { PASSWORD_POLICY, getPasswordValidationMessage } from "@familieappen/shared/auth/password-policy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { MailIcon, PasswordField } from "../../components/LoginFormFields";
import { Button } from "../../components/ui";
import { register } from "../../lib/api";
import { getUserFacingApiMessage } from "../../lib/auth-family";
import { routeAfterAuthentication } from "../../lib/onboarding-access";
import { saveAuthSession } from "../../lib/session";

export function RegisterForm({ initialEmail = "" }: { initialEmail?: string } = {}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = getFormString(formData, "email").trim();
    const password = getFormString(formData, "password");
    const confirmPassword = getFormString(formData, "confirmPassword");
    const hasAcceptedTerms = formData.get("terms") === "on";

    if (!email) {
      setError("Skriv inn e-postadressen din.");
      return;
    }

    if (!password) {
      setError("Lag et passord.");
      return;
    }

    const passwordPolicyError = getPasswordValidationMessage(password);
    if (passwordPolicyError) {
      setError(passwordPolicyError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passordene må være like.");
      return;
    }

    if (!hasAcceptedTerms) {
      setError("Du må godta vilkår og personvernerklæring for å fortsette.");
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = await register({
        // TODO: Replace this temporary display name when the profile onboarding step collects the user's name.
        name: getTemporaryDisplayName(email),
        email,
        password,
      });
      saveAuthSession(auth);
      await routeAfterAuthentication(router, "/onboarding/profile");
    } catch (submitError) {
      setError(getUserFacingApiMessage(submitError, "Noe gikk galt. Prøv igjen."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form register-form" noValidate onSubmit={handleSubmit}>
      <div className="login-field">
        <label className="login-field__label" htmlFor="register-email">E-postadresse</label>
        <div className="login-field__control">
          <MailIcon />
          <input
            autoComplete="email"
            className="login-field__input"
            id="register-email"
            name="email"
            placeholder="Skriv inn e-postadressen din"
            type="email"
            defaultValue={initialEmail}
          />
        </div>
      </div>

      <PasswordField
        autoComplete="new-password"
        helperText={PASSWORD_POLICY.helperText}
        id="register-password"
        label="Passord"
        name="password"
        placeholder="Lag et passord"
      />

      <PasswordField
        autoComplete="new-password"
        id="register-confirm-password"
        label="Bekreft passord"
        name="confirmPassword"
        placeholder="Gjenta passordet ditt"
        visibilityLabel="bekreft passord"
      />

      <label className="register-form__terms" htmlFor="register-terms">
        <input id="register-terms" name="terms" type="checkbox" />
        <span>
          Jeg godtar <Link href="/terms">vilkår</Link> og <Link href="/privacy">personvernerklæring</Link>
        </span>
      </label>

      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

      <Button disabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? "Oppretter konto…" : "Opprett konto"}
      </Button>
    </form>
  );
}

function getFormString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);

  return typeof value === "string" ? value : "";
}

function getTemporaryDisplayName(email: string): string {
  const [localPart] = email.split("@");
  const fallback = localPart?.replace(/[._-]+/g, " ").trim();

  return fallback || email;
}
