"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ChevronRight,
  Copy,
  Link as LinkIcon,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type {
  CalendarExportScope,
  CalendarViewMode,
} from "@familieappen/shared";

import { useFamilyMembers } from "../../../features/family/hooks/useFamilyMembers";
import {
  Badge,
  Button,
  Card,
  PageContainer,
  SectionHeader,
} from "../../../components/ui";
import { CalendarImportSettingsClient } from "./CalendarImportSettingsClient";
import {
  ApiError,
  getCalendarExportFeedSettings,
  regenerateCalendarExportFeed,
  updateCalendarExportFeedSettings,
  type CalendarExportFeedSettings,
} from "../../../lib/api";

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

const exportScopeOptions = [
  { value: "family", label: "Hele familien" },
  { value: "mine", label: "Kun mine hendelser" },
  { value: "selectedParticipant", label: "Valgt familiemedlem" },
] satisfies { value: CalendarExportScope; label: string }[];

function getApiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function defaultFeed(familyId: string): CalendarExportFeedSettings {
  const now = new Date().toISOString();
  return {
    id: "pending",
    familyId,
    enabled: false,
    privateUrl: "",
    includeEvents: true,
    includeMeals: true,
    includeReminders: true,
    includeSchoolWeekReminders: true,
    scope: "family",
    selectedFamilyMemberId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function CalendarSettingsClient() {
  const { family, familyMembers } = useFamilyMembers();
  const familyId = family?.id ?? null;
  const [preferences, setPreferences] =
    useState<CalendarPreferences>(initialPreferences);
  const [exportFeed, setExportFeed] =
    useState<CalendarExportFeedSettings | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const feed = exportFeed ?? (familyId ? defaultFeed(familyId) : null);

  const loadCalendarExportSettings = useCallback(async () => {
    if (!familyId) return;
    setErrorMessage(null);
    try {
      setExportFeed(await getCalendarExportFeedSettings(familyId));
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke hente ICS-innstillinger akkurat nå"),
      );
    }
  }, [familyId]);

  useEffect(() => {
    void loadCalendarExportSettings();
  }, [loadCalendarExportSettings]);

  async function updateExportFeed(
    updates: Partial<CalendarExportFeedSettings>,
  ) {
    if (!familyId) return;
    setCopyStatus("idle");
    setBusyId("feed");
    try {
      const updated = await updateCalendarExportFeedSettings(familyId, updates);
      setExportFeed(updated);
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke oppdatere kalenderabonnementet"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function regenerateExportLink() {
    if (!familyId) return;
    setCopyStatus("idle");
    setBusyId("feed");
    try {
      setExportFeed(await regenerateCalendarExportFeed(familyId));
      setStatusMessage(
        "Ny privat lenke er laget. Den gamle lenken virker ikke lenger.",
      );
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke regenerere lenken"));
    } finally {
      setBusyId(null);
    }
  }

  async function copyExportLink() {
    if (
      !feed?.enabled ||
      !feed.privateUrl ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      setCopyStatus("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(feed.privateUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <PageContainer>
      <p className="settings-page-intro">Velg hvordan kalenderen skal vises, importer ekte ICS-kalendere og del en privat abonnement-lenke.</p>

      {statusMessage ? (
        <Card tone="soft" className="calendar-status">
          <p className="calendar-card__message">{statusMessage}</p>
        </Card>
      ) : null}
      {errorMessage ? (
        <Card tone="warm" className="calendar-status">
          <p className="calendar-card__message">{errorMessage}</p>
        </Card>
      ) : null}

      <section
        className="calendar-settings-section"
        aria-labelledby="calendar-preferences-title"
      >
        <SectionHeader eyebrow="Kalender" title="Kalenderinnstillinger" />
        <Card className="calendar-settings-card">
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
        </Card>
      </section>

      <section
        className="calendar-settings-section"
        aria-labelledby="calendar-export-link-title"
      >
        <SectionHeader eyebrow="ICS" title="Kalenderabonnement" />
        <Card className="calendar-settings-card">
          <Link className="settings-row calendar-settings-link-row" href="/settings/calendar/export">
            <span className="calendar-import-intro__icon" aria-hidden="true">
              <LinkIcon size={22} />
            </span>
            <span className="settings-row__copy">
              <span className="settings-row__title" id="calendar-export-link-title">
                Kalenderabonnement
              </span>
              <span className="settings-row__description">
                Del FamilieAppen-kalenderen med Apple Kalender, Google Kalender eller Outlook.
              </span>
            </span>
            <span className="settings-row__chevron" aria-hidden="true">
              <ChevronRight size={20} />
            </span>
          </Link>
        </Card>
      </section>

      <section
        className="calendar-settings-section"
        aria-labelledby="calendar-export-title"
      >
        <SectionHeader eyebrow="ICS" title="Eksporter kalender" />
        <Card className="calendar-export-card">
          <div className="calendar-export-card__intro">
            <div className="calendar-import-intro__icon" aria-hidden="true">
              <LinkIcon size={24} />
            </div>
            <div>
              <h3 id="calendar-export-title">Privat kalenderabonnement</h3>
              <p>
                Lag en privat kalenderlenke som kan abonneres på i Apple
                Kalender, Google Kalender eller Outlook.
              </p>
            </div>
            <Badge tone={feed?.enabled ? "success" : "neutral"}>
              {feed?.enabled ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>

          <label
            className="settings-toggle-row"
            htmlFor="calendar-export-enabled"
          >
            <span>
              <span className="settings-label">Aktiver kalenderabonnement</span>
              <span className="settings-help">
                Kalenderklienter kan lese lenken uten innlogging.
              </span>
            </span>
            <input
              id="calendar-export-enabled"
              className="settings-toggle"
              type="checkbox"
              checked={Boolean(feed?.enabled)}
              disabled={!feed || busyId === "feed"}
              onChange={(event) =>
                void updateExportFeed({ enabled: event.target.checked })
              }
            />
          </label>

          <div
            className="calendar-export-url"
            aria-label="Privat kalenderlenke"
          >
            <div>
              <span className="settings-label">Privat kalenderlenke</span>
              <span className="settings-help">
                URL-en må behandles som privat og deles bare med
                kalenderklienter/personer du stoler på.
              </span>
            </div>
            <code>
              {feed?.privateUrl || "Aktiver abonnement for å lage lenke"}
            </code>
            <div className="calendar-export-url__actions">
              <Button
                variant="secondary"
                onClick={copyExportLink}
                disabled={!feed?.enabled}
              >
                <Copy aria-hidden="true" size={18} /> Kopier lenke
              </Button>
              <Button
                variant="secondary"
                onClick={regenerateExportLink}
                disabled={!feed || busyId === "feed"}
              >
                <RefreshCw aria-hidden="true" size={18} /> Regenerer lenke
              </Button>
            </div>
            {copyStatus === "copied" ? (
              <p className="calendar-export-url__status">Lenken er kopiert.</p>
            ) : null}
            {copyStatus === "failed" ? (
              <p className="calendar-export-url__status calendar-export-url__status--error">
                Kunne ikke kopiere automatisk. Marker og kopier lenken manuelt.
              </p>
            ) : null}
          </div>

          <div className="calendar-export-warning" role="note">
            <ShieldAlert aria-hidden="true" size={20} />
            <p>
              Alle som har lenken kan se kalenderinnholdet du deler. Regenerer
              lenken hvis den har blitt delt med feil person.
            </p>
          </div>

          <div
            className="settings-fieldset"
            role="group"
            aria-labelledby="calendar-export-content-label"
          >
            <div className="settings-fieldset__header">
              <span
                className="settings-label"
                id="calendar-export-content-label"
              >
                Innhold i eksporten
              </span>
              <span className="settings-help">
                Velg hva ICS-feeden skal inkludere.
              </span>
            </div>
            <label
              className="settings-toggle-row"
              htmlFor="export-include-events"
            >
              <span className="settings-label">Kalenderhendelser</span>
              <input
                id="export-include-events"
                className="settings-toggle"
                type="checkbox"
                checked={Boolean(feed?.includeEvents)}
                onChange={(event) =>
                  void updateExportFeed({ includeEvents: event.target.checked })
                }
              />
            </label>
            <label
              className="settings-toggle-row"
              htmlFor="export-include-meals"
            >
              <span className="settings-label">Middager</span>
              <input
                id="export-include-meals"
                className="settings-toggle"
                type="checkbox"
                checked={Boolean(feed?.includeMeals)}
                onChange={(event) =>
                  void updateExportFeed({ includeMeals: event.target.checked })
                }
              />
            </label>
            <label
              className="settings-toggle-row"
              htmlFor="export-include-reminders"
            >
              <span className="settings-label">Husk-påminnelser</span>
              <input
                id="export-include-reminders"
                className="settings-toggle"
                type="checkbox"
                checked={Boolean(feed?.includeReminders)}
                onChange={(event) =>
                  void updateExportFeed({
                    includeReminders: event.target.checked,
                  })
                }
              />
            </label>
            <label
              className="settings-toggle-row"
              htmlFor="export-include-school-week"
            >
              <span className="settings-label">Skoleuka-påminnelser</span>
              <input
                id="export-include-school-week"
                className="settings-toggle"
                type="checkbox"
                checked={Boolean(feed?.includeSchoolWeekReminders)}
                onChange={(event) =>
                  void updateExportFeed({
                    includeSchoolWeekReminders: event.target.checked,
                  })
                }
              />
            </label>
          </div>

          <div
            className="settings-fieldset"
            role="group"
            aria-labelledby="calendar-export-scope-label"
          >
            <div className="settings-fieldset__header">
              <span className="settings-label" id="calendar-export-scope-label">
                Hvem kalenderen gjelder
              </span>
              <span className="settings-help">
                Hele familien er støttet nå. Avgrensning er strukturert for
                videre utvidelse.
              </span>
            </div>
            <div
              className="segmented-control segmented-control--export"
              role="radiogroup"
              aria-labelledby="calendar-export-scope-label"
            >
              {exportScopeOptions.map((option) => (
                <label className="segmented-control__option" key={option.value}>
                  <input
                    type="radio"
                    name="calendarExportScope"
                    value={option.value}
                    checked={feed?.scope === option.value}
                    onChange={() =>
                      void updateExportFeed({ scope: option.value })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {feed?.scope === "selectedParticipant" ? (
              <label
                className="settings-select-row"
                htmlFor="export-selected-participant"
              >
                <span>
                  <span className="settings-label">Valgt familiemedlem</span>
                  <span className="settings-help">
                    Bare kalenderhendelser knyttet til dette familiemedlemmet
                    tas med.
                  </span>
                </span>
                <select
                  id="export-selected-participant"
                  value={feed.selectedFamilyMemberId ?? ""}
                  onChange={(event) =>
                    void updateExportFeed({
                      selectedFamilyMemberId: event.target.value || null,
                    })
                  }
                >
                  <option value="">Velg familiemedlem</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </Card>
      </section>

      <section
        className="calendar-settings-section"
        aria-labelledby="calendar-import-link-title"
      >
        <SectionHeader eyebrow="ICS" title="Importerte kalendere" />
        <Card className="calendar-settings-card">
          <Link className="settings-row calendar-settings-link-row" href="/settings/calendar/import">
            <span className="calendar-import-intro__icon" aria-hidden="true">
              <LinkIcon size={22} />
            </span>
            <span className="settings-row__copy">
              <span className="settings-row__title" id="calendar-import-link-title">
                Importerte kalendere
              </span>
              <span className="settings-row__description">
                Administrer kalendere fra Spond, skole, idrettslag og andre tjenester.
              </span>
            </span>
            <span className="settings-row__chevron" aria-hidden="true">
              <ChevronRight size={20} />
            </span>
          </Link>
        </Card>
      </section>

      <CalendarImportSettingsClient />
    </PageContainer>
  );
}
