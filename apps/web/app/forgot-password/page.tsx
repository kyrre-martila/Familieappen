"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { MailIcon } from "../../components/LoginFormFields";
import { Button } from "../../components/ui";

export default function ForgotPasswordPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: Connect to the forgot-password API endpoint when the backend flow is available.
  }

  return (
    <section className="login-screen" aria-labelledby="forgot-password-title">
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__light"
        height={492}
        priority
        src="/assets/illustrations/light-shadow.png"
        width={492}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="login-screen__plants"
        height={420}
        src="/assets/illustrations/plants.png"
        width={420}
      />

      <div className="login-screen__content">
        <Image
          alt="Familieappen"
          className="login-screen__logo"
          height={158}
          priority
          src="/assets/brand/familieappen-logo.svg"
          width={240}
        />

        <div className="login-screen__header">
          <h1 className="login-screen__title" id="forgot-password-title">Glemt passord?</h1>
          <p className="login-screen__subtitle">
            Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet ditt.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-field__label" htmlFor="forgot-password-email">E-postadresse</label>
            <div className="login-field__control">
              <MailIcon />
              <input
                autoComplete="email"
                className="login-field__input"
                id="forgot-password-email"
                name="email"
                placeholder="Skriv inn e-postadressen din"
                required
                type="email"
              />
            </div>
          </div>

          <Button type="submit" variant="primary">Send tilbakestillingslenke</Button>
        </form>

        <Link className="login-screen__back-link" href="/login">← Tilbake til innlogging</Link>
      </div>
    </section>
  );
}
