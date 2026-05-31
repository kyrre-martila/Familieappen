"use client";

import { useState } from "react";

function MailIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M4.75 6.75h14.5v10.5H4.75z" />
      <path d="m5.25 7.25 6.75 5.5 6.75-5.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" className="login-field__icon" fill="none" viewBox="0 0 24 24">
      <path d="M6.75 10.25h10.5v8H6.75z" />
      <path d="M9 10.25V8a3 3 0 1 1 6 0v2.25" />
      <path d="M12 13.75v1" />
    </svg>
  );
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return (
    <svg aria-hidden="true" className="login-field__toggle-icon" fill="none" viewBox="0 0 24 24">
      <path d="M3.75 12s2.75-5.25 8.25-5.25S20.25 12 20.25 12 17.5 17.25 12 17.25 3.75 12 3.75 12Z" />
      <path d="M12 9.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z" />
      {isVisible ? null : <path d="m5 19 14-14" />}
    </svg>
  );
}

export function LoginFormFields() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <>
      <div className="login-field">
        <label className="login-field__label" htmlFor="login-email">E-postadresse</label>
        <div className="login-field__control">
          <MailIcon />
          <input
            className="login-field__input"
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Skriv inn e-postadressen din"
            required
          />
        </div>
      </div>

      <div className="login-field">
        <label className="login-field__label" htmlFor="login-password">Passord</label>
        <div className="login-field__control">
          <LockIcon />
          <input
            className="login-field__input login-field__input--password"
            id="login-password"
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Skriv inn passordet ditt"
            required
          />
          <button
            aria-label={isPasswordVisible ? "Skjul passord" : "Vis passord"}
            className="login-field__toggle"
            onClick={() => setIsPasswordVisible((current) => !current)}
            type="button"
          >
            <EyeIcon isVisible={isPasswordVisible} />
          </button>
        </div>
      </div>
    </>
  );
}
