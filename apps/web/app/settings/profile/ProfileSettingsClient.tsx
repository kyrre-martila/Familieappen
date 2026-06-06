"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LogOut,
  Mail,
  Phone
} from "lucide-react";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import { ApiError, getCurrentUserProfile, updateCurrentUserProfile, type UserProfile } from "../../../lib/api";
import { clearAuthSession } from "../../../lib/session";

type EditableField = "name" | "email" | "phone";

type Profile = UserProfile;

const fieldLabels: Record<EditableField, string> = {
  name: "navn",
  email: "e-post",
  phone: "telefon"
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("nb-NO"))
    .join("") || "FA";
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function getProfileErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function ProfileSkeleton() {
  return (
    <div className="profile-settings__skeleton" aria-label="Laster profil">
      <span className="profile-settings__skeleton-avatar" />
      <span className="profile-settings__skeleton-line profile-settings__skeleton-line--wide" />
      <span className="profile-settings__skeleton-line" />
    </div>
  );
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  const initials = useMemo(() => getInitials(profile.name), [profile.name]);

  return (
    <div className="profile-settings__avatar-wrap">
      <div className="profile-settings__avatar" aria-label="Profilbilde">
        <span>{initials}</span>
      </div>
    </div>
  );
}

function EditableProfileRow({ field, icon, label, value, onEdit }: { field: EditableField; icon: ReactNode; label: string; value: string; onEdit: (field: EditableField) => void }) {
  return (
    <button className="profile-settings-row" type="button" onClick={() => onEdit(field)}>
      <span className="profile-settings-row__icon" aria-hidden="true">{icon}</span>
      <span className="profile-settings-row__label">{label}</span>
      <span className="profile-settings-row__value">{value || "Ikke lagt til"}</span>
      <ChevronRight className="profile-settings-row__chevron" aria-hidden="true" />
    </button>
  );
}

function AccountRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="profile-settings-row" type="button" onClick={onClick}>
      <span className="profile-settings-row__icon" aria-hidden="true">{icon}</span>
      <span className="profile-settings-row__label">{label}</span>
      <ChevronRight className="profile-settings-row__chevron" aria-hidden="true" />
    </button>
  );
}

function EditSheet({
  field,
  profile,
  error,
  isSaving,
  onCancel,
  onSave
}: {
  field: EditableField | null;
  profile: Profile;
  error: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (field: EditableField, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!field) {
      return;
    }

    setValue(profile[field] ?? "");
    setLocalError("");
  }, [field, profile]);

  if (!field) {
    return null;
  }

  const activeField = field;
  const title = `Endre ${fieldLabels[activeField]}`;
  const visibleError = localError || error;

  async function handleSave() {
    const nextValue = value.trim();

    if (activeField === "name" && !nextValue) {
      setLocalError("Navn må fylles ut.");
      return;
    }

    if (activeField === "email" && !isValidEmail(nextValue)) {
      setLocalError("Skriv inn en gyldig e-postadresse.");
      return;
    }

    setLocalError("");
    await onSave(activeField, activeField === "phone" ? value.trim() : nextValue);
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt redigering" onClick={onCancel} disabled={isSaving} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="profile-edit-title">{title}</h2>
        <label className="profile-edit-sheet__field">
          <span>{fieldLabels[activeField][0].toLocaleUpperCase("nb-NO") + fieldLabels[activeField].slice(1)}</span>
          <input
            autoFocus
            inputMode={activeField === "email" ? "email" : activeField === "phone" ? "tel" : "text"}
            type={activeField === "email" ? "email" : "text"}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setLocalError("");
            }}
            disabled={isSaving}
          />
        </label>
        {visibleError ? <p className="profile-edit-sheet__error">{visibleError}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isSaving}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProfileSettingsClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      setProfile(await getCurrentUserProfile());
    } catch (error) {
      setProfile(null);
      setLoadError(getProfileErrorMessage(error, "Profilen kunne ikke lastes akkurat nå."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function saveProfile(field: EditableField, value: string) {
    if (!profile) {
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const updatedProfile = await updateCurrentUserProfile({
        [field]: field === "phone" && value.trim() === "" ? null : value
      });

      setProfile(updatedProfile);
      setEditingField(null);
      setSuccessMessage("Profilen er oppdatert.");
    } catch (error) {
      setSaveError(getProfileErrorMessage(error, "Endringen ble ikke lagret. Prøv igjen."));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  return (
    <main className="settings-shell settings-shell--detail profile-settings" aria-labelledby="profile-settings-title">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>

      <header className="settings-hero settings-hero--detail profile-settings__hero">
        <h1 id="profile-settings-title">Profil</h1>
        {isLoading ? <ProfileSkeleton /> : null}
        {!isLoading && loadError ? (
          <div className="profile-settings__identity" role="alert">
            <p className="profile-settings__name">Kunne ikke laste profilen</p>
            <p className="profile-settings__email">{loadError}</p>
            <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={() => void loadProfile()}>
              Prøv igjen
            </button>
          </div>
        ) : null}
        {!isLoading && profile ? (
          <div className="profile-settings__identity">
            <ProfileAvatar profile={profile} />
            <p className="profile-settings__name">{profile.name}</p>
            <p className="profile-settings__email">{profile.email}</p>
          </div>
        ) : null}
      </header>

      {successMessage ? <p className="profile-edit-sheet__placeholder-text" role="status">{successMessage}</p> : null}

      {profile ? (
        <>
          <SettingsSection title="Profilinformasjon">
            <SettingsCard>
              <EditableProfileRow field="name" icon={<CircleUserRound />} label="Navn" value={profile.name} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
              <EditableProfileRow field="email" icon={<Mail />} label="E-post" value={profile.email} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
              <EditableProfileRow field="phone" icon={<Phone />} label="Telefon" value={profile.phone ?? ""} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
            </SettingsCard>
          </SettingsSection>

          <SettingsSection title="Konto">
            <SettingsCard>
              <AccountRow icon={<LogOut />} label="Logg ut" onClick={handleLogout} />
            </SettingsCard>
          </SettingsSection>

          <EditSheet field={editingField} profile={profile} error={saveError} isSaving={isSaving} onCancel={() => setEditingField(null)} onSave={saveProfile} />
        </>
      ) : null}
    </main>
  );
}
