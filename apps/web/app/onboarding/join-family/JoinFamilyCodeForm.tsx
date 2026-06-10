"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui";
import { ApiError, joinFamilyByCode } from "../../../lib/api";
import { savePendingFamilyRequest } from "../../../lib/session";

type JoinFamilyState = "entry" | "found";

function normalizeFamilyCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function JoinFamilyCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [screenState, setScreenState] = useState<JoinFamilyState>("entry");
  const [errorMessage, setErrorMessage] = useState("");
  const normalizedCode = useMemo(() => normalizeFamilyCode(code), [code]);

  async function validateCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedCode) {
      setErrorMessage("Skriv inn familiekoden du har fått tilsendt.");
      return;
    }

    try {
      await joinFamilyByCode(normalizedCode);
      setErrorMessage("");
      setScreenState("found");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setErrorMessage("Vi fant ikke en familie med denne koden. Sjekk koden og prøv igjen.");
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setErrorMessage("Du er allerede medlem av denne familien.");
        return;
      }

      setErrorMessage("Kunne ikke sende forespørselen akkurat nå. Prøv igjen.");
    }
  }

  function useAnotherCode() {
    setScreenState("entry");
    setCode("");
    setErrorMessage("");
  }

  function continueAfterJoinRequest() {
    savePendingFamilyRequest(normalizedCode);
    router.push("/dashboard");
  }

  if (screenState === "found") {
    return (
      <div className="join-family-found" aria-labelledby="join-family-title">
        <Image
          alt=""
          aria-hidden="true"
          className="join-family-found__illustration"
          height={512}
          priority
          sizes="(max-width: 32rem) 82vw, 24rem"
          src="/assets/illustrations/family-found.png"
          width={714}
        />

        <div className="login-screen__header join-family-found__header">
          <h1 className="login-screen__title" id="join-family-title">Forespørsel sendt</h1>
          <p className="login-screen__subtitle">Administrator må godkjenne deg før du får tilgang.</p>
        </div>

        <article className="join-family-found-card" aria-labelledby="join-family-found-card-title">
          <h2 id="join-family-found-card-title">Familie funnet</h2>
          <span className="join-family-found-card__divider" aria-hidden="true" />
          <p>Administrator må godkjenne forespørselen din før du får tilgang.</p>
        </article>

        <div className="join-family-found__actions">
          <Button className="join-family-found__primary" onClick={continueAfterJoinRequest} variant="primary">
            Gå videre
          </Button>
          <button className="join-family-found__secondary" onClick={useAnotherCode} type="button">
            Bruk en annen kode
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="auth-form join-family-form" onSubmit={validateCode} aria-labelledby="join-family-title" noValidate>
      <div className="login-screen__header join-family-screen__header">
        <h1 className="login-screen__title" id="join-family-title">Skriv inn familiekode</h1>
        <p className="login-screen__subtitle">Bruk koden du har fått for å be om tilgang til familien.</p>
      </div>

      <label className="login-field" htmlFor="family-code">
        <span className="login-field__label">Familiekode</span>
        <span className="login-field__control">
          <KeyIcon />
          <input
            autoComplete="off"
            className="login-field__input join-family-form__input"
            id="family-code"
            inputMode="text"
            onChange={(event) => setCode(event.target.value)}
            placeholder="FAMILIE-1234"
            type="text"
            value={code}
          />
        </span>
      </label>

      {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

      <Button className="join-family-form__submit" type="submit" variant="primary">
        Sjekk kode
      </Button>
    </form>
  );
}

function KeyIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M15 9.5a4.5 4.5 0 1 0-1.6 3.43L21 20.5V17h-3.5v-3.5h-3.1A4.47 4.47 0 0 0 15 9.5Z" />
      <path d="M7.5 9.5h.01" />
    </svg>
  );
}
