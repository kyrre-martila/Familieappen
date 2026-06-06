"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Trash2
} from "lucide-react";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import { clearAuthSession } from "../../../lib/session";

type EditableField = "name" | "email" | "phone";

type Profile = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
};

const PROFILE_STORAGE_KEY = "familieappen.profileSettings";

const defaultProfile: Profile = {
  name: "Elisabeth Martila",
  email: "elisabeth@martila.no",
  phone: "+47 123 45 678",
  avatarUrl: null
};

const fieldLabels: Record<EditableField, string> = {
  name: "navn",
  email: "e-post",
  phone: "telefon"
};

function loadProfile(): Profile {
  if (typeof window === "undefined") {
    return defaultProfile;
  }

  const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!savedProfile) {
    return defaultProfile;
  }

  try {
    const parsedProfile = JSON.parse(savedProfile) as Partial<Profile>;

    return {
      name: parsedProfile.name?.trim() || defaultProfile.name,
      email: parsedProfile.email?.trim() || defaultProfile.email,
      phone: parsedProfile.phone ?? defaultProfile.phone,
      avatarUrl: parsedProfile.avatarUrl?.trim() || null
    };
  } catch {
    return defaultProfile;
  }
}

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
        {profile.avatarUrl ? <img alt="" src={profile.avatarUrl} /> : <span>{initials}</span>}
      </div>
      <button className="profile-settings__avatar-edit" type="button" aria-label="Endre profilbilde">
        <Camera aria-hidden="true" />
      </button>
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

function AccountRow({ icon, label, destructive = false, onClick }: { icon: ReactNode; label: string; destructive?: boolean; onClick: () => void }) {
  return (
    <button className={`profile-settings-row${destructive ? " profile-settings-row--destructive" : ""}`} type="button" onClick={onClick}>
      <span className="profile-settings-row__icon" aria-hidden="true">{icon}</span>
      <span className="profile-settings-row__label">{label}</span>
      <ChevronRight className="profile-settings-row__chevron" aria-hidden="true" />
    </button>
  );
}

function EditSheet({ field, profile, onCancel, onSave }: { field: EditableField | null; profile: Profile; onCancel: () => void; onSave: (field: EditableField, value: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!field) {
      return;
    }

    setValue(profile[field]);
    setError("");
  }, [field, profile]);

  if (!field) {
    return null;
  }

  const activeField = field;
  const title = `Endre ${fieldLabels[activeField]}`;

  function handleSave() {
    const nextValue = value.trim();

    if (activeField === "name" && !nextValue) {
      setError("Navn må fylles ut.");
      return;
    }

    if (activeField === "email" && !isValidEmail(nextValue)) {
      setError("Skriv inn en gyldig e-postadresse.");
      return;
    }

    onSave(activeField, activeField === "phone" ? value.trim() : nextValue);
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Avbryt redigering" onClick={onCancel} />
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
              setError("");
            }}
          />
        </label>
        {error ? <p className="profile-edit-sheet__error">{error}</p> : null}
        <div className="profile-edit-sheet__actions">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--secondary" type="button" onClick={onCancel}>Avbryt</button>
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={handleSave}>Lagre</button>
        </div>
      </section>
    </div>
  );
}

function PlaceholderSheet({ title, onClose }: { title: string | null; onClose: () => void }) {
  if (!title) {
    return null;
  }

  return (
    <div className="profile-edit-sheet" role="presentation">
      <button className="profile-edit-sheet__backdrop" type="button" aria-label="Lukk" onClick={onClose} />
      <section className="profile-edit-sheet__panel profile-edit-sheet__panel--compact" role="dialog" aria-modal="true" aria-labelledby="profile-placeholder-title">
        <div className="profile-edit-sheet__handle" aria-hidden="true" />
        <h2 id="profile-placeholder-title">{title}</h2>
        <p className="profile-edit-sheet__placeholder-text">Kommer snart</p>
        <div className="profile-edit-sheet__actions profile-edit-sheet__actions--single">
          <button className="profile-edit-sheet__button profile-edit-sheet__button--primary" type="button" onClick={onClose}>OK</button>
        </div>
      </section>
    </div>
  );
}

export function ProfileSettingsClient() {
  const router = useRouter();
  const [profile, setProfile] = useState(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [placeholderTitle, setPlaceholderTitle] = useState<string | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setIsLoading(false);
  }, []);

  function saveProfile(field: EditableField, value: string) {
    const nextProfile = { ...profile, [field]: value };

    setProfile(nextProfile);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    setEditingField(null);
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
        {isLoading ? (
          <ProfileSkeleton />
        ) : (
          <div className="profile-settings__identity">
            <ProfileAvatar profile={profile} />
            <p className="profile-settings__name">{profile.name}</p>
            <p className="profile-settings__email">{profile.email}</p>
          </div>
        )}
      </header>

      <SettingsSection title="Profilinformasjon">
        <SettingsCard>
          <EditableProfileRow field="name" icon={<CircleUserRound />} label="Navn" value={profile.name} onEdit={setEditingField} />
          <EditableProfileRow field="email" icon={<Mail />} label="E-post" value={profile.email} onEdit={setEditingField} />
          <EditableProfileRow field="phone" icon={<Phone />} label="Telefon" value={profile.phone} onEdit={setEditingField} />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="Konto">
        <SettingsCard>
          <AccountRow icon={<LockKeyhole />} label="Endre passord" onClick={() => setPlaceholderTitle("Endre passord")} />
          <AccountRow icon={<LogOut />} label="Logg ut" onClick={handleLogout} />
          <AccountRow destructive icon={<Trash2 />} label="Slett konto" onClick={() => setPlaceholderTitle("Slett konto")} />
        </SettingsCard>
      </SettingsSection>

      <EditSheet field={editingField} profile={profile} onCancel={() => setEditingField(null)} onSave={saveProfile} />
      <PlaceholderSheet title={placeholderTitle} onClose={() => setPlaceholderTitle(null)} />
    </main>
  );
}
