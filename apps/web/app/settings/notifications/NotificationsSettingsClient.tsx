"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Gift,
  ListChecks,
  ShoppingBasket,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AppListRow } from "../../../components/app-ui";
import { SettingsCard, SettingsSection } from "../../../components/settings";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "../../../lib/api";

type NotificationPreferenceKey =
  | "shoppingEnabled"
  | "calendarEnabled"
  | "remindersEnabled"
  | "tasksEnabled"
  | "mealsEnabled"
  | "wishlistEnabled"
  | "systemEnabled";

type NotificationToggle = {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

const defaultPreferences: Pick<
  NotificationPreferences,
  NotificationPreferenceKey
> = {
  shoppingEnabled: true,
  calendarEnabled: true,
  remindersEnabled: true,
  tasksEnabled: true,
  mealsEnabled: true,
  wishlistEnabled: true,
  systemEnabled: true,
};

const notificationToggles: NotificationToggle[] = [
  {
    key: "shoppingEnabled",
    label: "Handleliste",
    description: "Motta varsler når familien oppdaterer handlelister.",
    icon: ShoppingBasket,
  },
  {
    key: "calendarEnabled",
    label: "Kalender",
    description: "Motta varsler om kalenderhendelser.",
    icon: CalendarDays,
  },
  {
    key: "remindersEnabled",
    label: "Påminnelser",
    description: "Motta varsler om nye eller oppdaterte påminnelser.",
    icon: Bell,
  },
  {
    key: "tasksEnabled",
    label: "Oppgaver",
    description: "Motta varsler om oppgaver.",
    icon: ListChecks,
  },
  {
    key: "mealsEnabled",
    label: "Middag",
    description: "Motta varsler om middag og middagsplanlegging.",
    icon: Utensils,
  },
  {
    key: "wishlistEnabled",
    label: "Ønskelister",
    description: "Motta varsler om ønsker og ønskelister.",
    icon: Gift,
  },
  {
    key: "systemEnabled",
    label: "Systemvarsler",
    description: "Motta automatiske varsler om manglende planlegging.",
    icon: Wrench,
  },
];

function pickPreferences(
  preferences: NotificationPreferences,
): Pick<NotificationPreferences, NotificationPreferenceKey> {
  return {
    shoppingEnabled: preferences.shoppingEnabled,
    calendarEnabled: preferences.calendarEnabled,
    remindersEnabled: preferences.remindersEnabled,
    tasksEnabled: preferences.tasksEnabled,
    mealsEnabled: preferences.mealsEnabled,
    wishlistEnabled: preferences.wishlistEnabled,
    systemEnabled: preferences.systemEnabled,
  };
}

export function NotificationsSettingsClient() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Set<NotificationPreferenceKey>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<NotificationPreferenceKey | null>(
    null,
  );

  useEffect(() => {
    let isActive = true;

    async function loadPreferences() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedPreferences = await getNotificationPreferences();
        if (isActive) setPreferences(pickPreferences(loadedPreferences));
      } catch {
        if (isActive) setError("Kunne ikke laste varselinnstillinger");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadPreferences();
    return () => {
      isActive = false;
    };
  }, []);

  async function togglePreference(key: NotificationPreferenceKey) {
    const nextValue = !preferences[key];
    const previousValue = preferences[key];

    setError(null);
    setSavedKey(null);
    setPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: nextValue,
    }));
    setSavingKeys((currentKeys) => new Set(currentKeys).add(key));

    try {
      const savedPreferences = await updateNotificationPreferences({
        [key]: nextValue,
      });
      setPreferences(pickPreferences(savedPreferences));
      setSavedKey(key);
      window.setTimeout(
        () =>
          setSavedKey((currentKey) => (currentKey === key ? null : currentKey)),
        1800,
      );
    } catch {
      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        [key]: previousValue,
      }));
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
    <main
      className="settings-shell settings-shell--detail notification-settings"
      aria-labelledby="notification-settings-title"
    >
      <Link
        className="settings-back-link"
        href="/settings"
        aria-label="Tilbake til innstillinger"
      >
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail notification-settings__hero">
        <h1 id="notification-settings-title">Varsler</h1>
        <p>Velg hvilke varsler du vil motta fra familien.</p>
      </header>

      {error ? (
        <p
          className="form-message form-message--error notification-settings__error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <SettingsSection title="Varslingskategorier">
        <SettingsCard className="notification-settings__card">
          <div className="notification-settings__sections" aria-busy={isLoading}>
            {notificationToggles.map((toggle) => {
              const Icon = toggle.icon;

              return (
                <AppListRow
                  as="label"
                  className="notification-settings-row"
                  key={toggle.key}
                >
                  <span
                    className="notification-settings-row__icon"
                    aria-hidden="true"
                  >
                    <Icon aria-hidden="true" />
                  </span>
                  <span className="notification-settings-row__copy">
                    <span className="notification-settings-row__label">
                      {toggle.label}
                    </span>
                    <span className="notification-settings-row__description">
                      {toggle.description}
                    </span>
                  </span>
                  {savedKey === toggle.key ? (
                    <span className="notification-settings-row__saved">
                      Lagret
                    </span>
                  ) : null}
                  <input
                    aria-label={toggle.label}
                    checked={preferences[toggle.key]}
                    className="settings-toggle notification-settings-row__toggle"
                    disabled={isLoading || savingKeys.has(toggle.key)}
                    onChange={() => void togglePreference(toggle.key)}
                    type="checkbox"
                  />
                </AppListRow>
              );
            })}
          </div>
        </SettingsCard>
      </SettingsSection>
    </main>
  );
}
