"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui";

const ONBOARDING_PROFILE_STORAGE_KEY = "familieappen:onboarding-profile";

const NORWAY_COUNTRY_CODE = "+47";

type ProfileFormValues = {
  birthDate: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

const initialValues: ProfileFormValues = {
  birthDate: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

export function ProfileOnboardingForm() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem(ONBOARDING_PROFILE_STORAGE_KEY);

    if (!savedProfile) {
      return;
    }

    try {
      const parsedProfile = JSON.parse(savedProfile) as Partial<ProfileFormValues>;

      setValues({
        birthDate: parsedProfile.birthDate ?? "",
        firstName: parsedProfile.firstName ?? "",
        lastName: parsedProfile.lastName ?? "",
        phoneNumber: parsedProfile.phoneNumber ?? "",
      });
    } catch {
      window.localStorage.removeItem(ONBOARDING_PROFILE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function updateValue(field: keyof ProfileFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setAvatarPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedValues = {
      birthDate: values.birthDate,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phoneNumber: values.phoneNumber.trim(),
    };

    if (!trimmedValues.firstName || !trimmedValues.lastName || !trimmedValues.phoneNumber || !trimmedValues.birthDate) {
      setError("Fyll ut feltene som er merket med stjerne.");
      return;
    }

    // TODO: Replace this temporary local onboarding state when profile persistence is available in the backend.
    window.localStorage.setItem(
      ONBOARDING_PROFILE_STORAGE_KEY,
      JSON.stringify({
        ...trimmedValues,
        countryCode: NORWAY_COUNTRY_CODE,
      }),
    );

    router.push("/onboarding/family-start");
  }

  return (
    <form className="auth-form onboarding-profile-form" noValidate onSubmit={handleSubmit}>
      <div className="onboarding-profile-form__photo-field">
        <div className="onboarding-profile-form__avatar">
          {avatarPreviewUrl ? (
            <img alt="" className="onboarding-profile-form__avatar-image" src={avatarPreviewUrl} />
          ) : (
            <DefaultAvatarIcon />
          )}
          <button
            aria-label="Last opp profilbilde"
            className="onboarding-profile-form__upload-button"
            onClick={() => avatarInputRef.current?.click()}
            type="button"
          >
            <CameraIcon />
          </button>
        </div>
        <button
          className="onboarding-profile-form__photo-label"
          onClick={() => avatarInputRef.current?.click()}
          type="button"
        >
          Legg til bilde (anbefalt)
        </button>
        <input
          ref={avatarInputRef}
          accept="image/*"
          className="sr-only"
          id="profile-avatar"
          name="avatar"
          onChange={handleAvatarChange}
          tabIndex={-1}
          type="file"
        />
      </div>

      <div className="login-field">
        <label className="login-field__label" htmlFor="profile-first-name">Fornavn *</label>
        <div className="login-field__control">
          <UserIcon />
          <input
            autoComplete="given-name"
            className="login-field__input"
            id="profile-first-name"
            name="firstName"
            onChange={(event) => updateValue("firstName", event.target.value)}
            placeholder="Skriv inn fornavn"
            required
            type="text"
            value={values.firstName}
          />
        </div>
      </div>

      <div className="login-field">
        <label className="login-field__label" htmlFor="profile-last-name">Etternavn *</label>
        <div className="login-field__control">
          <UserIcon />
          <input
            autoComplete="family-name"
            className="login-field__input"
            id="profile-last-name"
            name="lastName"
            onChange={(event) => updateValue("lastName", event.target.value)}
            placeholder="Skriv inn etternavn"
            required
            type="text"
            value={values.lastName}
          />
        </div>
      </div>

      <div className="login-field">
        <label className="login-field__label" htmlFor="profile-phone">Telefonnummer *</label>
        <div className="login-field__control onboarding-profile-form__phone-control">
          <PhoneIcon />
          <select
            aria-label="Landskode"
            className="onboarding-profile-form__country-code"
            defaultValue={NORWAY_COUNTRY_CODE}
            name="countryCode"
          >
            <option value={NORWAY_COUNTRY_CODE}>{NORWAY_COUNTRY_CODE}</option>
          </select>
          <span className="onboarding-profile-form__divider" aria-hidden="true" />
          <input
            autoComplete="tel"
            className="login-field__input"
            id="profile-phone"
            inputMode="tel"
            name="phoneNumber"
            onChange={(event) => updateValue("phoneNumber", event.target.value)}
            placeholder="Skriv inn telefonnummer"
            required
            type="tel"
            value={values.phoneNumber}
          />
        </div>
      </div>

      <div className="login-field">
        <label className="login-field__label" htmlFor="profile-birth-date">Fødselsdato *</label>
        <div className="login-field__control onboarding-profile-form__date-control">
          <CalendarIcon />
          <input
            aria-label="Fødselsdato"
            autoComplete="bday"
            className="login-field__input onboarding-profile-form__date-input"
            id="profile-birth-date"
            name="birthDate"
            onChange={(event) => updateValue("birthDate", event.target.value)}
            placeholder="Velg fødselsdato"
            required
            type="date"
            value={values.birthDate}
          />
          {values.birthDate ? null : <span className="onboarding-profile-form__date-placeholder">Velg fødselsdato</span>}
          <CalendarIcon variant="trailing" />
        </div>
      </div>

      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

      <Button type="submit" variant="primary">Fortsett</Button>
    </form>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      <path d="M5.25 19.25c.75-3.15 3.25-5 6.75-5s6 1.85 6.75 5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M7.25 4.75 9.5 9l-2 1.5c.95 2.2 2.8 4.05 5 5l1.5-2 4.25 2.25-.75 3.5c-.14.63-.7 1.05-1.35.99C9.75 19.65 4.35 14.25 3.76 7.85c-.06-.65.36-1.21.99-1.35l2.5-.75Z" />
    </svg>
  );
}

function CalendarIcon({ variant = "leading" }: { variant?: "leading" | "trailing" }) {
  const className = variant === "trailing" ? "login-field__icon onboarding-profile-form__date-icon" : "login-field__icon";

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M6.75 4.75v3" />
      <path d="M17.25 4.75v3" />
      <path d="M4.75 7.25h14.5v12H4.75z" />
      <path d="M4.75 10.75h14.5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M8.25 7.25 9.5 5.5h5l1.25 1.75h2.5v10.5H5.75V7.25h2.5Z" />
      <path d="M12 15.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function DefaultAvatarIcon() {
  return (
    <svg aria-hidden="true" className="onboarding-profile-form__avatar-placeholder" fill="none" viewBox="0 0 160 160">
      <circle cx="80" cy="55" r="26" fill="currentColor" opacity="0.38" />
      <path d="M27 137c7.5-31 27.5-48 53-48s45.5 17 53 48" fill="currentColor" opacity="0.38" />
    </svg>
  );
}
