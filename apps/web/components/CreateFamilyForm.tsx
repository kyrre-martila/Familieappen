"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboardingFamilyState, saveOnboardingFamilyState } from "../lib/onboarding-state";
import { Button } from "./ui";

export function CreateFamilyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState("");

  useEffect(() => {
    const savedFamily = getOnboardingFamilyState();

    if (savedFamily?.family.name) {
      setFamilyName(savedFamily.family.name);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedFamilyName = familyName.trim();

    if (!trimmedFamilyName) {
      setError("Skriv inn et familienavn.");
      return;
    }

    setError(null);
    saveOnboardingFamilyState(trimmedFamilyName);
    router.push("/onboarding/family-members");
  }

  return (
    <form className="auth-form onboarding-create-family-form" noValidate onSubmit={handleSubmit}>
      <div className="login-field">
        <label className="login-field__label" htmlFor="family-name">
          Familienavn <span className="onboarding-create-family-form__required" aria-hidden="true">*</span>
        </label>
        <div className="login-field__control">
          <HomeIcon />
          <input
            autoComplete="organization"
            className="login-field__input"
            id="family-name"
            name="familyName"
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="F.eks. Familien Hansen"
            required
            type="text"
            value={familyName}
          />
        </div>
        <p className="login-field__helper">Du kan endre dette senere.</p>
      </div>

      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

      <Button type="submit" variant="primary">Opprett familie</Button>
    </form>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M4.75 10.75 12 4.5l7.25 6.25" />
      <path d="M6.75 9.5v9.75h10.5V9.5" />
      <path d="M10 19.25v-5.5h4v5.5" />
    </svg>
  );
}
