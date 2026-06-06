"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences
} from "../../../lib/api";

type NotificationPreferenceKey = "calendar_events" | "calendar_reminders" | "husk_reminders" | "wishlist_shared" | "family_invites";

type NotificationSection = {
  title: string;
  toggles: Array<{
    key: NotificationPreferenceKey;
    label: string;
  }>;
};

const defaultPreferences: Pick<NotificationPreferences, NotificationPreferenceKey> = {
  calendar_events: true,
  calendar_reminders: true,
  husk_reminders: true,
  wishlist_shared: true,
  family_invites: true
};

const notificationSections: NotificationSection[] = [
  {
    title: "Kalender",
    toggles: [
      { key: "calendar_events", label: "Kalenderhendelser" },
      { key: "calendar_reminders", label: "Påminnelser" }
    ]
  },
  {
    title: "Husk",
    toggles: [{ key: "husk_reminders", label: "Husk-påminnelser" }]
  },
  {
    title: "Ønskeliste",
    toggles: [{ key: "wishlist_shared", label: "Noen deler ønskeliste med meg" }]
  },
  {
    title: "Familie",
    toggles: [{ key: "family_invites", label: "Familieinvitasjoner" }]
  }
];

export function NotificationsSettingsClient() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Set<NotificationPreferenceKey>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadPreferences() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedPreferences = await getNotificationPreferences();

        if (!isActive) {
          return;
        }

        setPreferences({
          calendar_events: loadedPreferences.calendar_events,
          calendar_reminders: loadedPreferences.calendar_reminders,
          husk_reminders: loadedPreferences.husk_reminders,
          wishlist_shared: loadedPreferences.wishlist_shared,
          family_invites: loadedPreferences.family_invites
        });
      } catch {
        if (isActive) {
          setError("Kunne ikke laste varselinnstillinger");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      isActive = false;
    };
  }, []);

  async function togglePreference(key: NotificationPreferenceKey) {
    const nextValue = !preferences[key];
    const previousPreferences = preferences;

    setError(null);
    setPreferences((currentPreferences) => ({ ...currentPreferences, [key]: nextValue }));
    setSavingKeys((currentKeys) => new Set(currentKeys).add(key));

    try {
      const savedPreferences = await updateNotificationPreferences({ [key]: nextValue });
      setPreferences({
        calendar_events: savedPreferences.calendar_events,
        calendar_reminders: savedPreferences.calendar_reminders,
        husk_reminders: savedPreferences.husk_reminders,
        wishlist_shared: savedPreferences.wishlist_shared,
        family_invites: savedPreferences.family_invites
      });
    } catch {
      setPreferences((currentPreferences) => ({ ...currentPreferences, [key]: previousPreferences[key] }));
      setError("Kunne ikke lagre varselinnstilling");
    } finally {
      setSavingKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.delete(key);
        return nextKeys;
      });
    }
  }

  return (
    <main className="settings-shell settings-shell--detail notification-settings" aria-labelledby="notification-settings-title">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail notification-settings__hero">
        <h1 id="notification-settings-title">Varsler</h1>
      </header>

      {error ? <p className="notification-settings__error" role="alert">{error}</p> : null}

      <div className="notification-settings__sections" aria-busy={isLoading}>
        {notificationSections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            <SettingsCard>
              {section.toggles.map((toggle) => (
                <label className="notification-settings-row" key={toggle.key}>
                  <span className="notification-settings-row__label">{toggle.label}</span>
                  <input
                    aria-label={toggle.label}
                    checked={preferences[toggle.key]}
                    className="settings-toggle notification-settings-row__toggle"
                    disabled={isLoading || savingKeys.has(toggle.key)}
                    onChange={() => void togglePreference(toggle.key)}
                    type="checkbox"
                  />
                </label>
              ))}
            </SettingsCard>
          </SettingsSection>
        ))}
      </div>
    </main>
  );
}
