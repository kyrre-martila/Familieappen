"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  Download,
  Upload,
} from "lucide-react";
import type { CalendarViewMode } from "@familieappen/shared";

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "../../../components/settings";

type WeekStart = "monday";
type ReminderPreference = "none" | "15m" | "1h" | "1d";

interface CalendarPreferences {
  defaultView: CalendarViewMode;
  weekStartsOn: WeekStart;
  showWeekNumbers: boolean;
  defaultReminder: ReminderPreference;
}

const initialPreferences: CalendarPreferences = {
  defaultView: "day",
  weekStartsOn: "monday",
  showWeekNumbers: true,
  defaultReminder: "15m",
};

const viewOptions = [
  { value: "day", label: "Dag" },
  { value: "month", label: "Måned" },
  { value: "list", label: "Liste" },
] satisfies { value: CalendarViewMode; label: string }[];

const reminderOptions = [
  { value: "none", label: "Ingen" },
  { value: "15m", label: "15 minutter før" },
  { value: "1h", label: "1 time før" },
  { value: "1d", label: "1 dag før" },
] satisfies { value: ReminderPreference; label: string }[];

export function CalendarSettingsClient() {
  const [preferences, setPreferences] =
    useState<CalendarPreferences>(initialPreferences);

  return (
    <main className="settings-shell settings-shell--detail calendar-settings" aria-label="Kalender">
      <Link className="settings-back-link" href="/settings" aria-label="Tilbake til innstillinger">
        <ChevronLeft aria-hidden="true" />
      </Link>

      <header className="settings-hero settings-hero--detail">
        <h1>Kalender</h1>
      </header>

      <SettingsSection title="Kalenderinnstillinger">
        <SettingsCard className="calendar-settings-card">
          <div
            className="settings-fieldset"
            role="group"
            aria-labelledby="default-view-label"
          >
            <div className="settings-fieldset__header">
              <span className="settings-label" id="default-view-label">
                Standardvisning
              </span>
              <span className="settings-help">
                Velges når kalenderen åpnes.
              </span>
            </div>
            <div
              className="segmented-control"
              role="radiogroup"
              aria-labelledby="default-view-label"
            >
              {viewOptions.map((option) => (
                <label className="segmented-control__option" key={option.value}>
                  <input
                    type="radio"
                    name="defaultView"
                    value={option.value}
                    checked={preferences.defaultView === option.value}
                    onChange={() =>
                      setPreferences((current) => ({
                        ...current,
                        defaultView: option.value,
                      }))
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="settings-select-row" htmlFor="week-starts-on">
            <span>
              <span className="settings-label">Første dag i uken</span>
              <span className="settings-help">
                FamilieAppen bruker mandag som norsk kalenderstandard.
              </span>
            </span>
            <select
              id="week-starts-on"
              value={preferences.weekStartsOn}
              onChange={() =>
                setPreferences((current) => ({
                  ...current,
                  weekStartsOn: "monday",
                }))
              }
            >
              <option value="monday">Mandag</option>
            </select>
          </label>

          <label className="settings-toggle-row" htmlFor="show-week-numbers">
            <span>
              <span className="settings-label">Vis ukenummer</span>
              <span className="settings-help">
                Gjør det lettere å planlegge skole, ferie og aktiviteter.
              </span>
            </span>
            <input
              id="show-week-numbers"
              className="settings-toggle"
              type="checkbox"
              checked={preferences.showWeekNumbers}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  showWeekNumbers: event.target.checked,
                }))
              }
            />
          </label>

          <label className="settings-select-row" htmlFor="default-reminder">
            <span>
              <span className="settings-label">Standard påminnelse</span>
              <span className="settings-help">
                Foreslås når nye hendelser opprettes.
              </span>
            </span>
            <select
              id="default-reminder"
              value={preferences.defaultReminder}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  defaultReminder: event.target.value as ReminderPreference,
                }))
              }
            >
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection>
        <SettingsCard>
          <SettingsRow
            href="/settings/calendar/export"
            icon={<Download />}
            title="Kalenderabonnement"
            description="Del FamilieAppen-kalenderen med Apple Kalender, Google Kalender eller Outlook."
          />
          <SettingsRow
            href="/settings/calendar/import"
            icon={<Upload />}
            title="Importerte kalendere"
            description="Administrer kalendere fra Spond, skole, idrettslag og andre tjenester."
          />
        </SettingsCard>
      </SettingsSection>
    </main>
  );
}
