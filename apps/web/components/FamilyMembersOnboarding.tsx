"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addOnboardingFamilyInvite,
  ensureOnboardingFamilyState,
  type OnboardingFamilyInvite,
  type OnboardingInviteRole,
} from "../lib/onboarding-state";
import { getOnboardingCompletionRoute } from "../lib/onboarding-completion";
import { Button } from "./ui";

const roleOptions: Array<{ role: OnboardingInviteRole; description: string; icon: ReactNode }> = [
  {
    role: "Administrator",
    description: "Full tilgang til å administrere familien",
    icon: <ShieldIcon />,
  },
  {
    role: "Foresatt",
    description: "Kan administrere innhold og medlemmer",
    icon: <UsersIcon />,
  },
  {
    role: "Barn",
    description: "Begrenset tilgang til innhold",
    icon: <ChildIcon />,
  },
];

export function FamilyMembersOnboarding() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("MARTILA-4821");
  const [members, setMembers] = useState<OnboardingFamilyInvite[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = ensureOnboardingFamilyState();

    if (state) {
      setFamilyCode(state.family.code);
      setMembers(state.invitedMembers);
    }
  }, []);

  function handleSave(input: { email: string; role: OnboardingInviteRole }) {
    const nextState = addOnboardingFamilyInvite(input);

    if (nextState) {
      setMembers(nextState.invitedMembers);
      setFamilyCode(nextState.family.code);
    }

    setIsModalOpen(false);
  }

  async function copyFamilyCode(feedback = "Kode kopiert") {
    try {
      await navigator.clipboard?.writeText(familyCode);
      setCopyMessage(feedback);
    } catch {
      setCopyMessage("Kopier koden manuelt");
    }

    window.setTimeout(() => setCopyMessage(null), 2400);
  }

  async function shareFamilyCode() {
    const shareData = {
      title: "Familiekode",
      text: `Bli med i familien min i FamilieAppen med koden ${familyCode}.`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setCopyMessage("Familiekode delt");
        window.setTimeout(() => setCopyMessage(null), 2400);
        return;
      } catch {
        // Fall back to clipboard when native sharing is unavailable or cancelled.
      }
    }

    await copyFamilyCode("Familiekode kopiert");
  }

  return (
    <div className="family-members-panel">
      <section className="family-members-list" aria-labelledby="invited-members-title">
        <h2 id="invited-members-title">Inviterte familiemedlemmer</h2>
        <ul className="family-members-list__items" aria-label="Inviterte familiemedlemmer">
          {members.length ? (
            members.map((member) => <InviteMemberCard key={member.id} member={member} />)
          ) : (
            <li className="family-members-empty">Ingen familiemedlemmer er invitert ennå.</li>
          )}
        </ul>
      </section>

      <div className="family-members-actions" aria-label="Invitasjonshandlinger">
        <Button className="family-members-button family-members-button--primary" onClick={() => setIsModalOpen(true)} variant="primary">
          <PlusIcon />
          Legg til familiemedlem
        </Button>
        <Button className="family-members-button family-members-button--secondary" onClick={() => void shareFamilyCode()} variant="secondary">
          <LinkIcon />
          Del familiekode
        </Button>
      </div>

      <section className="family-code-card" aria-labelledby="family-code-title">
        <span className="family-code-card__icon" aria-hidden="true"><QrIcon /></span>
        <div className="family-code-card__copy">
          <h2 id="family-code-title">Familiekode</h2>
          <p>{familyCode}</p>
        </div>
        <Button className="family-code-card__button" onClick={() => void copyFamilyCode()} variant="secondary">
          <CopyIcon />
          Kopier kode
        </Button>
      </section>

      <div className="family-members-feedback" aria-live="polite">{copyMessage}</div>
      <p className="family-members-helper">Du kan alltid invitere flere senere.</p>

      <Button className="family-members-continue" onClick={() => router.push(getOnboardingCompletionRoute())} variant="primary">
        Gå videre
      </Button>

      {isModalOpen ? <AddFamilyMemberModal onClose={() => setIsModalOpen(false)} onSave={handleSave} /> : null}
    </div>
  );
}

function InviteMemberCard({ member }: { member: OnboardingFamilyInvite }) {
  const isWarning = member.status === "not-sent";

  return (
    <li className="invite-member-card">
      <span className="invite-member-card__avatar" aria-hidden="true"><MailIcon /></span>
      <div className="invite-member-card__details">
        <p className="invite-member-card__email">{member.email}</p>
        <p className={isWarning ? "invite-member-card__status invite-member-card__status--warning" : "invite-member-card__status"}>
          {isWarning ? "Invitasjon ikke sendt" : "Invitasjon sendt"}
        </p>
      </div>
      <span className={`invite-member-card__role invite-member-card__role--${member.role.toLowerCase()}`}>{member.role}</span>
      <button className="invite-member-card__menu" type="button" aria-label={`Flere valg for ${member.email}`}>
        <DotsIcon />
      </button>
    </li>
  );
}

function AddFamilyMemberModal({ onClose, onSave }: { onClose: () => void; onSave: (input: { email: string; role: OnboardingInviteRole }) => void }) {
  const titleId = useId();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OnboardingInviteRole>("Administrator");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function trapFocus(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute("disabled"));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Skriv inn e-postadresse.");
      return;
    }

    setError(null);
    onSave({ email: trimmedEmail, role });
    setEmail("");
    setRole("Administrator");
  }

  return (
    <div className="family-member-modal" role="presentation">
      <button className="family-member-modal__backdrop" aria-label="Lukk legg til familiemedlem" onClick={onClose} type="button" />
      <form
        aria-labelledby={titleId}
        aria-modal="true"
        className="family-member-modal__sheet"
        onKeyDown={trapFocus}
        onSubmit={handleSubmit}
        ref={dialogRef}
        role="dialog"
      >
        <div className="family-member-modal__header">
          <h2 id={titleId}>Legg til familiemedlem</h2>
          <button className="family-member-modal__close" onClick={onClose} ref={closeButtonRef} type="button" aria-label="Lukk">
            <CloseIcon />
          </button>
        </div>

        <div className="login-field family-member-modal__field">
          <label className="login-field__label" htmlFor={emailId}>E-postadresse <span aria-hidden="true">*</span></label>
          <div className="login-field__control family-member-modal__email-control">
            <input
              autoComplete="email"
              className="login-field__input"
              id={emailId}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Skriv inn e-postadresse"
              required
              type="email"
              value={email}
            />
            <MailIcon />
          </div>
        </div>

        <fieldset className="family-role-fieldset">
          <legend>Rolle</legend>
          <div className="family-role-options">
            {roleOptions.map((option) => (
              <RoleCard
                description={option.description}
                icon={option.icon}
                isSelected={role === option.role}
                key={option.role}
                onSelect={() => setRole(option.role)}
                role={option.role}
              />
            ))}
          </div>
        </fieldset>

        {error ? <p className="form-message form-message--error family-member-modal__error" role="alert">{error}</p> : null}

        <Button className="family-member-modal__save" type="submit" variant="primary">Lagre</Button>
      </form>
    </div>
  );
}

function RoleCard({ description, icon, isSelected, onSelect, role }: { description: string; icon: ReactNode; isSelected: boolean; onSelect: () => void; role: OnboardingInviteRole }) {
  return (
    <button
      aria-pressed={isSelected}
      className={isSelected ? "family-role-card family-role-card--selected" : "family-role-card"}
      onClick={onSelect}
      type="button"
    >
      <span className="family-role-card__icon" aria-hidden="true">{icon}</span>
      <span className="family-role-card__title">{role}</span>
      <span className="family-role-card__description">{description}</span>
    </button>
  );
}

function MailIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 6.75h16v10.5H4z" /><path d="m4.75 7.5 7.25 5.25L19.25 7.5" /></svg>;
}

function PlusIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

function LinkIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m9.5 14.5 5-5" /><path d="M10.75 7.25 12 6a4 4 0 0 1 5.66 5.66l-1.25 1.25" /><path d="M13.25 16.75 12 18a4 4 0 0 1-5.66-5.66l1.25-1.25" /></svg>;
}

function QrIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 5h5v5H5z" /><path d="M14 5h5v5h-5z" /><path d="M5 14h5v5H5z" /><path d="M14 14h2.5" /><path d="M19 14v2.5" /><path d="M14 19h5" /><path d="M19 19v-1" /></svg>;
}

function CopyIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M9 9h10v10H9z" /><path d="M5 15V5h10" /></svg>;
}

function DotsIcon() {
  return <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>;
}

function ShieldIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 4.5 18 7v4.75c0 3.6-2.45 6.92-6 7.75-3.55-.83-6-4.15-6-7.75V7z" /></svg>;
}

function UsersIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M16.5 12a2.5 2.5 0 1 0 0-5" /><path d="M4.5 19a5 5 0 0 1 10 0" /><path d="M14.5 16.25A4.5 4.5 0 0 1 20 19" /></svg>;
}

function ChildIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 12.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" /><path d="M6.75 19.25a5.25 5.25 0 0 1 10.5 0" /><path d="M8.75 8.75 7 7" /><path d="M15.25 8.75 17 7" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m6 6 12 12" /><path d="M18 6 6 18" /></svg>;
}
