"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Copy,
  Link as LinkIcon,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { CalendarExportScope } from "@familieappen/shared";

import { useFamilyMembers } from "../../../../features/family/hooks/useFamilyMembers";
import { Badge, Button, Card, SectionHeader } from "../../../../components/ui";
import {
  ApiError,
  getCalendarExportFeedSettings,
  regenerateCalendarExportFeed,
  updateCalendarExportFeedSettings,
  type CalendarExportFeedSettings,
} from "../../../../lib/api";

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

export function CalendarExportSettingsClient() {
  const { family, familyMembers } = useFamilyMembers();
  const familyId = family?.id ?? null;
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
        getApiMessage(
          error,
          "Kunne ikke hente kalenderabonnementet akkurat nå",
        ),
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
    <main
      className="settings-shell settings-shell--detail calendar-export-settings"
      aria-label="Kalenderabonnement"
    >
      <Link
        className="settings-back-link"
        href="/settings/calendar"
        aria-label="Tilbake til kalenderinnstillinger"
      >
        <ChevronLeft aria-hidden="true" />
      </Link>
      <header className="settings-hero settings-hero--detail">
        <h1>Kalenderabonnement</h1>
        <p>
          Del FamilieAppen-kalenderen med Apple Kalender, Google Kalender eller
          Outlook.
        </p>
      </header>

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
    </main>
  );
}
