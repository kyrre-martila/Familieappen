"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CalendarClock,
  CircleHelp,
  Copy,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type {
  CalendarExportScope,
  CalendarMvpEventIcon,
  CalendarViewMode,
} from "@familieappen/shared";

import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import { useFamilyMembers } from "../../../features/family/hooks/useFamilyMembers";
import {
  Badge,
  Button,
  Card,
  PageContainer,
  SectionHeader,
} from "../../../components/ui";
import { SharedAudienceSelector } from "../../../features/husk/components/SharedAudienceSelector";
import {
  ApiError,
  createCalendarIcsSource,
  deleteCalendarIcsSource,
  getCalendarExportFeedSettings,
  getCalendarIcsSources,
  regenerateCalendarExportFeed,
  syncCalendarIcsSource,
  updateCalendarExportFeedSettings,
  updateCalendarIcsSource,
  type CalendarExportFeedSettings,
  type CalendarIcsSource,
} from "../../../lib/api";

type WeekStart = "monday";
type ReminderPreference = "none" | "15m" | "1h" | "1d";

interface CalendarPreferences {
  defaultView: CalendarViewMode;
  weekStartsOn: WeekStart;
  showWeekNumbers: boolean;
  defaultReminder: ReminderPreference;
}

interface CalendarImportDraft {
  name: string;
  url: string;
  defaultFamilyMemberId: string | null;
  defaultCategory: CalendarMvpEventIcon;
  active: boolean;
}

const initialPreferences: CalendarPreferences = {
  defaultView: "day",
  weekStartsOn: "monday",
  showWeekNumbers: true,
  defaultReminder: "15m",
};

const emptyImportDraft: CalendarImportDraft = {
  name: "",
  url: "",
  defaultFamilyMemberId: null,
  defaultCategory: "sport",
  active: true,
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

const iconOptions = [
  { value: "sport", label: "Sport" },
  { value: "school", label: "Skole" },
  { value: "birthday", label: "Bursdag" },
  { value: "health", label: "Helse" },
  { value: "travel", label: "Reise" },
  { value: "family", label: "Familie" },
  { value: "meal", label: "Middag" },
] satisfies { value: CalendarMvpEventIcon; label: string }[];

const exportScopeOptions = [
  { value: "family", label: "Hele familien" },
  { value: "mine", label: "Kun mine hendelser" },
  { value: "selectedParticipant", label: "Valgt familiemedlem" },
] satisfies { value: CalendarExportScope; label: string }[];

function getApiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function formatLastSynced(source: CalendarIcsSource) {
  if (!source.lastSyncedAt) return "Ikke synkronisert ennå";
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(source.lastSyncedAt));
}

function getParticipantName(
  participantId: string | null,
  familyMembers: ReturnType<typeof useFamilyMembers>["familyMembers"],
) {
  if (!participantId) return "Hele familien";
  return (
    familyMembers.find((member) => member.id === participantId)?.name ??
    "Ikke valgt"
  );
}

function getIconLabel(icon: string) {
  return iconOptions.find((option) => option.value === icon)?.label ?? icon;
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
  const { refresh: refreshCalendar } = useCalendar();
  const { family, familyMembers } = useFamilyMembers();
  const familyId = family?.id ?? null;
  const [preferences, setPreferences] =
    useState<CalendarPreferences>(initialPreferences);
  const [imports, setImports] = useState<CalendarIcsSource[]>([]);
  const [exportFeed, setExportFeed] =
    useState<CalendarExportFeedSettings | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [draft, setDraft] = useState<CalendarImportDraft>(emptyImportDraft);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDefaultParticipantOpen, setIsDefaultParticipantOpen] =
    useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isEditing = editingImportId !== null;
  const formTitle = isEditing ? "Rediger import" : "Legg til kalenderimport";
  const canSaveImport =
    Boolean(familyId) &&
    draft.name.trim().length > 0 &&
    draft.url.trim().length > 0;
  const activeImportCount = useMemo(
    () => imports.filter((source) => source.active).length,
    [imports],
  );
  const feed = exportFeed ?? (familyId ? defaultFeed(familyId) : null);

  const loadCalendarIcsSettings = useCallback(async () => {
    if (!familyId) return;
    setErrorMessage(null);
    try {
      const [sources, feedSettings] = await Promise.all([
        getCalendarIcsSources(familyId),
        getCalendarExportFeedSettings(familyId),
      ]);
      setImports(sources);
      setExportFeed(feedSettings);
      setDraft((current) => ({
        ...current,
        defaultFamilyMemberId:
          current.defaultFamilyMemberId ?? familyMembers[0]?.id ?? null,
      }));
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke hente ICS-innstillinger akkurat nå"),
      );
    }
  }, [familyId, familyMembers]);

  useEffect(() => {
    void loadCalendarIcsSettings();
  }, [loadCalendarIcsSettings]);

  function resetForm() {
    setDraft({
      ...emptyImportDraft,
      defaultFamilyMemberId: familyMembers[0]?.id ?? null,
    });
    setEditingImportId(null);
    setIsFormOpen(false);
  }

  function openNewImportForm() {
    setDraft({
      ...emptyImportDraft,
      defaultFamilyMemberId: familyMembers[0]?.id ?? null,
    });
    setEditingImportId(null);
    setIsFormOpen(true);
  }

  function openEditImportForm(source: CalendarIcsSource) {
    setDraft({
      name: source.name,
      url: source.url,
      defaultFamilyMemberId: source.defaultFamilyMemberId,
      defaultCategory: source.defaultCategory as CalendarMvpEventIcon,
      active: source.active,
    });
    setEditingImportId(source.id);
    setIsFormOpen(true);
  }

  async function handleSaveImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!familyId || !canSaveImport) return;

    setBusyId("form");
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const payload = {
        name: draft.name.trim(),
        url: draft.url.trim(),
        active: draft.active,
        defaultFamilyMemberId: draft.defaultFamilyMemberId,
        defaultCategory: draft.defaultCategory,
      };
      const saved = editingImportId
        ? await updateCalendarIcsSource(familyId, editingImportId, payload)
        : await createCalendarIcsSource(familyId, payload);
      setImports((current) =>
        editingImportId
          ? current.map((source) => (source.id === saved.id ? saved : source))
          : [...current, saved],
      );
      setStatusMessage(
        editingImportId
          ? "Kalenderimporten er oppdatert."
          : "Kalenderimporten er lagt til. Trykk Synkroniser nå for å hente hendelser.",
      );
      resetForm();
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke lagre kalenderimporten"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleImportActive(source: CalendarIcsSource) {
    if (!familyId) return;
    setBusyId(source.id);
    try {
      const updated = await updateCalendarIcsSource(familyId, source.id, {
        active: !source.active,
      });
      setImports((current) =>
        current.map((item) => (item.id === source.id ? updated : item)),
      );
      await refreshCalendar();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke endre importstatus"));
    } finally {
      setBusyId(null);
    }
  }

  async function syncImportNow(sourceId: string) {
    if (!familyId) return;
    setBusyId(sourceId);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const result = await syncCalendarIcsSource(familyId, sourceId);
      setImports((current) =>
        current.map((source) =>
          source.id === sourceId ? result.source : source,
        ),
      );
      if (result.source.lastSyncStatus === "error") {
        setErrorMessage(result.source.lastSyncError ?? "Synkronisering feilet");
      } else {
        setStatusMessage(
          `Synkronisert: ${result.imported} nye, ${result.updated} oppdatert, ${result.removed} fjernet.`,
        );
      }
      await refreshCalendar();
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke synkronisere kalenderimporten"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeImport(sourceId: string) {
    if (!familyId) return;
    setBusyId(sourceId);
    try {
      await deleteCalendarIcsSource(familyId, sourceId);
      setImports((current) =>
        current.filter((source) => source.id !== sourceId),
      );
      if (editingImportId === sourceId) resetForm();
      await refreshCalendar();
    } catch (error) {
      setErrorMessage(
        getApiMessage(error, "Kunne ikke fjerne kalenderimporten"),
      );
    } finally {
      setBusyId(null);
    }
  }

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
        aria-labelledby="calendar-imports-title"
      >
        <SectionHeader
          eyebrow="ICS"
          title="Importer kalender"
          action={
            <Button variant="primary" onClick={openNewImportForm}>
              <Plus aria-hidden="true" size={18} /> Legg til
            </Button>
          }
        />
        <Card className="calendar-import-intro" tone="soft">
          <div className="calendar-import-intro__icon" aria-hidden="true">
            <LinkIcon size={24} />
          </div>
          <div>
            <p className="calendar-import-intro__title">
              Legg til en ekstern kalender, for eksempel fra Spond, skole eller
              idrettslag.
            </p>
            <p className="calendar-import-intro__body">
              Importerte ICS-hendelser vises i FamilieAppen-kalenderen. Den
              eksterne kilden er sannhet for tittel, tid og sted, mens
              FamilieAppen kan berike hendelser med standard deltaker og
              ikon/kategori.
            </p>
          </div>
          <Badge tone={activeImportCount > 0 ? "success" : "neutral"}>
            {activeImportCount} aktive
          </Badge>
        </Card>

        {isFormOpen ? (
          <Card className="calendar-import-form-card" tone="default">
            <form className="calendar-import-form" onSubmit={handleSaveImport}>
              <div className="calendar-import-form__header">
                <div>
                  <h3>{formTitle}</h3>
                  <p>
                    Legg inn detaljene vi trenger for å vise importerte
                    hendelser med riktig familie-kontekst.
                  </p>
                </div>
                <Button variant="ghost" onClick={resetForm}>
                  Avbryt
                </Button>
              </div>
              <div className="calendar-import-form__grid">
                <label className="form-field" htmlFor="import-name">
                  <span className="form-field__label">Navn</span>
                  <input
                    className="form-field__input"
                    id="import-name"
                    type="text"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Fiona Spond RG"
                  />
                </label>
                <label className="form-field" htmlFor="import-url">
                  <span className="form-field__label">ICS URL</span>
                  <input
                    className="form-field__input"
                    id="import-url"
                    type="url"
                    value={draft.url}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        url: event.target.value,
                      }))
                    }
                    placeholder="https://.../calendar.ics"
                  />
                </label>
                <SharedAudienceSelector
                  labelledBy="default-participant"
                  isOpen={isDefaultParticipantOpen}
                  members={familyMembers}
                  onToggleOpen={() =>
                    setIsDefaultParticipantOpen((isOpen) => !isOpen)
                  }
                  selectedMemberIds={
                    draft.defaultFamilyMemberId
                      ? [draft.defaultFamilyMemberId]
                      : []
                  }
                  setSelectedMemberIds={(value) => {
                    const nextIds =
                      typeof value === "function"
                        ? value(
                            draft.defaultFamilyMemberId
                              ? [draft.defaultFamilyMemberId]
                              : [],
                          )
                        : value;
                    setDraft((current) => ({
                      ...current,
                      defaultFamilyMemberId: nextIds[0] ?? null,
                    }));
                  }}
                  title="Standard deltaker"
                  singleSelect
                />
                <label className="form-field" htmlFor="default-icon">
                  <span className="form-field__label">
                    Standard ikon/kategori
                  </span>
                  <select
                    className="form-field__input"
                    id="default-icon"
                    value={draft.defaultCategory}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        defaultCategory: event.target
                          .value as CalendarMvpEventIcon,
                      }))
                    }
                  >
                    {iconOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="settings-toggle-row settings-toggle-row--form"
                  htmlFor="import-active"
                >
                  <span>
                    <span className="settings-label">Aktiv import</span>
                    <span className="settings-help">
                      Inaktive importer vises ikke i kalenderen.
                    </span>
                  </span>
                  <input
                    id="import-active"
                    className="settings-toggle"
                    type="checkbox"
                    checked={draft.active}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        active: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="calendar-import-form__actions">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={!canSaveImport || busyId === "form"}
                >
                  Lagre import
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="calendar-import-list" aria-label="Importerte kalendere">
          {imports.map((source) => (
            <Card
              className="calendar-import-card"
              key={source.id}
              tone={source.active ? "default" : "soft"}
            >
              <div className="calendar-import-card__header">
                <div className="calendar-import-card__title-group">
                  <span
                    className="calendar-import-card__icon"
                    aria-hidden="true"
                  >
                    <CalendarClock size={22} />
                  </span>
                  <div>
                    <h3>{source.name}</h3>
                    <p>{source.url}</p>
                  </div>
                </div>
                <Badge tone={source.active ? "success" : "neutral"}>
                  {source.active ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
              <dl className="calendar-import-card__meta">
                <div>
                  <dt>Standard deltaker</dt>
                  <dd>
                    {getParticipantName(
                      source.defaultFamilyMemberId,
                      familyMembers,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Standard ikon/kategori</dt>
                  <dd>{getIconLabel(source.defaultCategory)}</dd>
                </div>
                <div>
                  <dt>Synkstatus</dt>
                  <dd>
                    {source.lastSyncStatus === "error"
                      ? "Feil"
                      : source.lastSyncStatus === "success"
                        ? "OK"
                        : "Ikke kjørt"}
                  </dd>
                </div>
                <div>
                  <dt>Sist synkronisert</dt>
                  <dd>{formatLastSynced(source)}</dd>
                </div>
              </dl>
              {source.lastSyncError ? (
                <div className="calendar-import-card__note">
                  <CircleHelp aria-hidden="true" size={18} />
                  <p>{source.lastSyncError}</p>
                </div>
              ) : (
                <div className="calendar-import-card__note">
                  <CircleHelp aria-hidden="true" size={18} />
                  <p>
                    Du kan endre lokal deltaker og kategori her, men ikke
                    tittel, tid eller sted fra den eksterne kalenderen.
                  </p>
                </div>
              )}
              <div className="calendar-import-card__actions">
                <label
                  className="calendar-import-card__toggle"
                  htmlFor={`active-${source.id}`}
                >
                  <span>{source.active ? "Aktiv" : "Inaktiv"}</span>
                  <input
                    id={`active-${source.id}`}
                    className="settings-toggle"
                    type="checkbox"
                    checked={source.active}
                    disabled={busyId === source.id}
                    onChange={() => void toggleImportActive(source)}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={() => void syncImportNow(source.id)}
                  disabled={!source.active || busyId === source.id}
                >
                  <RefreshCw aria-hidden="true" size={18} /> Synkroniser nå
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openEditImportForm(source)}
                >
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => void removeImport(source.id)}
                  disabled={busyId === source.id}
                >
                  <Trash2 aria-hidden="true" size={18} /> Fjern import
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
