"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Camera,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Trash2
} from "lucide-react";
import { ProfileImageCropper } from "../../../components/avatar/ProfileImageCropper";
import { UserAvatar } from "../../../components/avatar/UserAvatar";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import { ApiError, changeCurrentUserPassword, deleteCurrentUserAccount, getCurrentUserProfile, logout, removeCurrentUserAvatar, updateCurrentUserProfile, uploadCurrentUserAvatar, type ChangePasswordInput, type DeleteAccountInput, type UserProfile } from "../../../lib/api";
import { clearAuthSession } from "../../../lib/session";

type EditableField = "firstName" | "middleName" | "lastName" | "email" | "phone";

type Profile = UserProfile;

const fieldLabels: Record<EditableField, string> = {
  firstName: "fornavn",
  middleName: "mellomnavn",
  lastName: "etternavn",
  email: "e-post",
  phone: "telefon"
};

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
  return (
    <div className="profile-settings__avatar-wrap">
      <UserAvatar identity={profile} avatarUrl={profile.avatarUrl} size="xl" className="profile-settings__avatar" />
    </div>
  );
}

function ProfileAvatarToggle({ expanded, profile, onClick }: { expanded: boolean; profile: Profile; onClick: () => void }) {
  return (
    <button
      className="profile-settings__avatar-button"
      type="button"
      aria-expanded={expanded}
      aria-controls="profile-picture-section"
      aria-label={expanded ? "Skjul valg for profilbilde" : "Vis valg for profilbilde"}
      onClick={onClick}
    >
      <ProfileAvatar profile={profile} />
      <span className="profile-settings__avatar-edit" aria-hidden="true">
        <Camera />
      </span>
      <span className="profile-settings__avatar-hint">Endre bilde</span>
    </button>
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

function AccountRow({ icon, label, onClick, destructive = false }: { icon: ReactNode; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button className={`profile-settings-row${destructive ? " profile-settings-row--destructive" : ""}`} type="button" onClick={onClick}>
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

    if ((activeField === "firstName" || activeField === "lastName") && !nextValue) {
      setLocalError("Fornavn og etternavn må fylles ut.");
      return;
    }

    if (activeField === "email" && !isValidEmail(nextValue)) {
      setLocalError("Skriv inn en gyldig e-postadresse.");
      return;
    }

    setLocalError("");
    await onSave(activeField, activeField === "phone" || activeField === "middleName" ? value.trim() : nextValue);
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

function PasswordChangeSheet({
  error,
  isSaving,
  onCancel,
  onSave
}: {
  error: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: ChangePasswordInput) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const visibleError = localError || error;

  async function handleSave() {
    if (!currentPassword) {
      setLocalError("Nåværende passord må fylles ut.");
      return;
    }

    if (!newPassword) {
      setLocalError("Nytt passord må fylles ut.");
      return;
    }

    if (!confirmPassword) {
      setLocalError("Gjenta nytt passord.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Passordene er ikke like.");
      return;
    }

    setLocalError("");
    await onSave({ currentPassword, newPassword, confirmPassword });
  }

  function updatePasswordValue(setValue: (value: string) => void, value: string) {
    setValue(value);
    setLocalError("");
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk passordendring" onClick={onCancel} disabled={isSaving} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="password-change-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="password-change-title">Endre passord</h2>
        <label className="profile-edit-sheet__field">
          <span>Nåværende passord</span>
          <input
            autoFocus
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => updatePasswordValue(setCurrentPassword, event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className="profile-edit-sheet__field">
          <span>Nytt passord</span>
          <input
            autoComplete="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => updatePasswordValue(setNewPassword, event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className="profile-edit-sheet__field">
          <span>Gjenta nytt passord</span>
          <input
            autoComplete="new-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => updatePasswordValue(setConfirmPassword, event.target.value)}
            disabled={isSaving}
          />
        </label>
        {visibleError ? <p className="profile-edit-sheet__error" role="alert">{visibleError}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isSaving}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Oppdaterer…" : "Oppdater passord"}
          </button>
        </div>
      </section>
    </div>
  );
}

function DeleteAccountSheet({
  error,
  isSaving,
  onCancel,
  onDelete
}: {
  error: string;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (input: DeleteAccountInput) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [localError, setLocalError] = useState("");
  const visibleError = localError || error;

  async function handleDelete() {
    if (!password) {
      setLocalError("Passord må fylles ut.");
      return;
    }

    if (confirmationText !== "SLETT") {
      setLocalError("Skriv SLETT for å bekrefte.");
      return;
    }

    setLocalError("");
    await onDelete({ password, confirmationText });
  }

  function clearAndSet(setValue: (value: string) => void, value: string) {
    setValue(value);
    setLocalError("");
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk sletting av konto" onClick={onCancel} disabled={isSaving} />
      <section className="profile-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="delete-account-title">Slett konto</h2>
        <p className="profile-edit-sheet__placeholder-text">Når du sletter kontoen mister du tilgang til familien, hendelser og innhold knyttet til kontoen din.</p>
        <label className="profile-edit-sheet__field">
          <span>Passord</span>
          <input
            autoFocus
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => clearAndSet(setPassword, event.target.value)}
            disabled={isSaving}
          />
        </label>
        <label className="profile-edit-sheet__field">
          <span>Skriv SLETT for å bekrefte</span>
          <input
            autoComplete="off"
            type="text"
            value={confirmationText}
            onChange={(event) => clearAndSet(setConfirmationText, event.target.value)}
            disabled={isSaving}
          />
        </label>
        {visibleError ? <p className="profile-edit-sheet__error" role="alert">{visibleError}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel} disabled={isSaving}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--danger" type="button" onClick={handleDelete} disabled={isSaving}>
            {isSaving ? "Sletter…" : "Slett konto"}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProfileSettingsClient() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [saveError, setSaveError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isAvatarSectionOpen, setIsAvatarSectionOpen] = useState(false);

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
        [field]: (field === "phone" || field === "middleName") && value.trim() === "" ? null : value
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

  function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setAvatarError("");
    setSelectedAvatarFile(file);
  }

  async function saveAvatar(file: File) {
    setIsAvatarSaving(true);
    setAvatarError("");
    setSuccessMessage("");

    try {
      const updatedProfile = await uploadCurrentUserAvatar(file);
      setProfile(updatedProfile);
      setSelectedAvatarFile(null);
      setSuccessMessage("Profilbildet er oppdatert.");
    } catch (error) {
      setAvatarError(getProfileErrorMessage(error, "Profilbildet ble ikke lagret. Prøv igjen."));
    } finally {
      setIsAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setIsAvatarSaving(true);
    setAvatarError("");
    setSuccessMessage("");

    try {
      const updatedProfile = await removeCurrentUserAvatar();
      setProfile(updatedProfile);
      setSuccessMessage("Profilbildet er fjernet.");
    } catch (error) {
      setAvatarError(getProfileErrorMessage(error, "Profilbildet ble ikke fjernet. Prøv igjen."));
    } finally {
      setIsAvatarSaving(false);
    }
  }

  async function savePassword(input: ChangePasswordInput) {
    setIsPasswordSaving(true);
    setPasswordError("");
    setSuccessMessage("");

    try {
      const response = await changeCurrentUserPassword(input);
      setIsPasswordSheetOpen(false);
      setSuccessMessage(response.message || "Passordet ble oppdatert");
    } catch (error) {
      setPasswordError(getProfileErrorMessage(error, "Passordet ble ikke oppdatert. Prøv igjen."));
    } finally {
      setIsPasswordSaving(false);
    }
  }


  async function deleteAccount(input: DeleteAccountInput) {
    setIsDeletingAccount(true);
    setDeleteError("");
    setSuccessMessage("");

    try {
      await deleteCurrentUserAccount(input);
      clearAuthSession();
      setIsDeleteSheetOpen(false);
      router.replace("/login?accountDeleted=1");
    } catch (error) {
      setDeleteError(getProfileErrorMessage(error, "Kontoen ble ikke slettet. Prøv igjen."));
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function openDeleteSheet() {
    setDeleteError("");
    setSuccessMessage("");
    setIsDeleteSheetOpen(true);
  }

  function closeDeleteSheet() {
    setDeleteError("");
    setIsDeleteSheetOpen(false);
  }

  function openPasswordSheet() {
    setPasswordError("");
    setSuccessMessage("");
    setIsPasswordSheetOpen(true);
  }

  function closePasswordSheet() {
    setPasswordError("");
    setIsPasswordSheetOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Always clear local state so a failed network logout cannot trap the user in the app.
    } finally {
      clearAuthSession();
      router.replace("/login");
    }
  }

  return (
    <main className="settings-shell settings-shell--detail profile-settings" aria-label="Profil">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>

      <header className="settings-hero settings-hero--detail profile-settings__hero">
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
            <ProfileAvatarToggle expanded={isAvatarSectionOpen} profile={profile} onClick={() => setIsAvatarSectionOpen((isOpen) => !isOpen)} />
            <p className="profile-settings__name">{profile.displayName || profile.name}</p>
            <p className="profile-settings__email">{profile.email}</p>
          </div>
        ) : null}
      </header>

      {successMessage ? <p className="profile-edit-sheet__placeholder-text" role="status">{successMessage}</p> : null}

      {profile ? (
        <>
          {isAvatarSectionOpen ? (
            <SettingsSection title="Profilbilde">
              <div id="profile-picture-section">
                <SettingsCard>
                  <div className="profile-settings-picture">
                    <ProfileAvatar profile={profile} />
                    <div className="profile-settings-picture__actions">
                      <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={() => avatarInputRef.current?.click()} disabled={isAvatarSaving}>Endre bilde</button>
                      {profile.avatarUrl ? <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={() => void removeAvatar()} disabled={isAvatarSaving}>Fjern bilde</button> : null}
                    </div>
                    <input ref={avatarInputRef} accept="image/*,.heic,.heif" className="sr-only" type="file" onChange={handleAvatarSelected} />
                    {avatarError ? <p className="profile-edit-sheet__error" role="alert">{avatarError}</p> : null}
                  </div>
                </SettingsCard>
              </div>
            </SettingsSection>
          ) : null}

          <div className="profile-settings__compact-section">
            <SettingsSection title="Profilinformasjon">
              <SettingsCard>
                <EditableProfileRow field="firstName" icon={<CircleUserRound />} label="Fornavn" value={profile.firstName} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
                <EditableProfileRow field="middleName" icon={<CircleUserRound />} label="Mellomnavn" value={profile.middleName ?? ""} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
                <EditableProfileRow field="lastName" icon={<CircleUserRound />} label="Etternavn" value={profile.lastName} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
                <EditableProfileRow field="email" icon={<Mail />} label="E-post" value={profile.email} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
                <EditableProfileRow field="phone" icon={<Phone />} label="Telefon" value={profile.phone ?? ""} onEdit={(field) => { setSaveError(""); setEditingField(field); }} />
              </SettingsCard>
            </SettingsSection>
          </div>

          <div className="profile-settings__compact-section">
            <SettingsSection title="Konto">
              <SettingsCard>
                <AccountRow icon={<KeyRound />} label="Endre passord" onClick={openPasswordSheet} />
                <AccountRow icon={<Trash2 />} label="Slett konto" onClick={openDeleteSheet} destructive />
                <AccountRow icon={<LogOut />} label="Logg ut" onClick={handleLogout} />
              </SettingsCard>
            </SettingsSection>
          </div>

          <EditSheet field={editingField} profile={profile} error={saveError} isSaving={isSaving} onCancel={() => setEditingField(null)} onSave={saveProfile} />
          <ProfileImageCropper file={selectedAvatarFile} error={avatarError} isSaving={isAvatarSaving} onCancel={() => setSelectedAvatarFile(null)} onConfirm={(file) => void saveAvatar(file)} />
          {isPasswordSheetOpen ? (
            <PasswordChangeSheet error={passwordError} isSaving={isPasswordSaving} onCancel={closePasswordSheet} onSave={savePassword} />
          ) : null}
          {isDeleteSheetOpen ? (
            <DeleteAccountSheet error={deleteError} isSaving={isDeletingAccount} onCancel={closeDeleteSheet} onDelete={deleteAccount} />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
