"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bug, ChevronLeft, ChevronRight, FileText, Info, Mail, MessageSquare } from "lucide-react";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import { ApiError, submitFeedback } from "../../../lib/api";

type SheetMode = "feedback" | "bug" | "contact" | "license" | null;
type FeedbackType = "feedback" | "bug";

interface AppInfoSettingsClientProps {
  supportEmail: string | null;
  version: string;
}

interface AppInfoRowProps {
  description?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  value?: string;
}

function AppInfoRow({ description, icon, label, onClick, value }: AppInfoRowProps) {
  const content = (
    <>
      <span className="settings-row__icon" aria-hidden="true">{icon}</span>
      <span className="settings-row__copy">
        <span className="settings-row__title">{label}</span>
        {description ? <span className="settings-row__description">{description}</span> : null}
        {value ? <span className="app-info-row__value">{value}</span> : null}
      </span>
      {onClick ? (
        <span className="settings-row__chevron" aria-hidden="true">
          <ChevronRight />
        </span>
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="settings-row app-info-row app-info-row--static">{content}</div>;
  }

  return (
    <button className="settings-row app-info-row" type="button" onClick={onClick}>
      {content}
    </button>
  );
}

export function FeedbackSheet({ type, version, onCancel, onSent }: { type: FeedbackType; version: string; onCancel: () => void; onSent: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const isBug = type === "bug";

  async function handleSend() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError(isBug ? "Skriv kort hva som skjedde." : "Skriv en kort melding.");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      await submitFeedback({
        type,
        message: trimmedMessage,
        appVersion: version
      });

      setStatus("sent");
      setMessage("");
      onSent(isBug ? "Takk, feilen er rapportert." : "Takk for tilbakemeldingen.");
    } catch (error) {
      setStatus("error");
      setError(error instanceof ApiError ? error.message : "Kunne ikke sende nå. Prøv igjen senere.");
    }
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk" onClick={onCancel} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="app-info-feedback-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="app-info-feedback-title">{isBug ? "Rapporter feil" : "Send tilbakemelding"}</h2>
        <label className="profile-edit-sheet__field">
          <span>{isBug ? "Hva skjedde?" : "Melding"}</span>
          <textarea
            autoFocus
            className="app-info-textarea"
            rows={4}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setError("");
              if (status !== "idle") {
                setStatus("idle");
              }
            }}
          />
        </label>
        <p className="app-info-sheet__privacy-note">Ikke del sensitive opplysninger her.</p>
        {error ? <p className="profile-edit-sheet__error">{error}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" disabled={status === "sending"} onClick={onCancel}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" disabled={status === "sending"} onClick={handleSend}>
            {status === "sending" ? "Sender…" : "Send"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ContactSheet({ supportEmail, onClose }: { supportEmail: string | null; onClose: () => void }) {
  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk" onClick={onClose} />
      <section className="profile-edit-sheet__panel profile-edit-sheet__panel--compact" role="dialog" aria-modal="true" aria-labelledby="app-info-contact-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="app-info-contact-title">Kontakt oss</h2>
        {supportEmail ? (
          <p className="profile-edit-sheet__placeholder-text">
            Vi hjelper deg på <a className="app-info-email-link" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        ) : (
          <p className="profile-edit-sheet__placeholder-text">Bruk kontaktadressen i app-butikken hvis e-post ikke er satt opp.</p>
        )}
        <div className="profile-edit-sheet__actions profile-edit-sheet__actions--single">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={onClose}>Lukk</button>
        </div>
      </section>
    </div>
  );
}

function LicenseSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk" onClick={onClose} />
      <section className="profile-edit-sheet__panel profile-edit-sheet__panel--compact" role="dialog" aria-modal="true" aria-labelledby="app-info-license-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="app-info-license-title">Lisensinformasjon</h2>
        <p className="profile-edit-sheet__placeholder-text">Tredjepartslisenser publiseres sammen med endelig app-pakke.</p>
        <div className="profile-edit-sheet__actions profile-edit-sheet__actions--single">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={onClose}>Lukk</button>
        </div>
      </section>
    </div>
  );
}

export function AppInfoSettingsClient({ supportEmail, version }: AppInfoSettingsClientProps) {
  const [sheet, setSheet] = useState<SheetMode>(null);
  const [successMessage, setSuccessMessage] = useState("");

  return (
    <main className="settings-shell settings-shell--detail app-info-settings" aria-label="App-info">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <p>Informasjon om appen, hjelp og kontakt.</p>
      </header>

      <SettingsSection title="Hjelp">
        <SettingsCard>
          <AppInfoRow icon={<MessageSquare />} label="Send tilbakemelding" onClick={() => { setSuccessMessage(""); setSheet("feedback"); }} />
          <AppInfoRow icon={<Bug />} label="Rapporter feil" onClick={() => { setSuccessMessage(""); setSheet("bug"); }} />
          <AppInfoRow icon={<Mail />} label="Kontakt oss" onClick={() => setSheet("contact")} />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Om appen">
        <SettingsCard>
          <AppInfoRow icon={<Info />} label="Versjon" value={version} />
          <AppInfoRow icon={<FileText />} label="Lisensinformasjon" onClick={() => setSheet("license")} />
        </SettingsCard>
      </SettingsSection>

      {successMessage ? <p className="app-info-settings__success" role="status">{successMessage}</p> : null}

      <footer className="settings-footer" aria-label="Juridiske lenker">
        <Link href="/privacy">Personvern</Link>
        <span aria-hidden="true">|</span>
        <Link href="/terms">Vilkår</Link>
      </footer>

      {sheet === "feedback" ? <FeedbackSheet type="feedback" version={version} onCancel={() => setSheet(null)} onSent={(message) => { setSheet(null); setSuccessMessage(message); }} /> : null}
      {sheet === "bug" ? <FeedbackSheet type="bug" version={version} onCancel={() => setSheet(null)} onSent={(message) => { setSheet(null); setSuccessMessage(message); }} /> : null}
      {sheet === "contact" ? <ContactSheet supportEmail={supportEmail} onClose={() => setSheet(null)} /> : null}
      {sheet === "license" ? <LicenseSheet onClose={() => setSheet(null)} /> : null}
    </main>
  );
}
