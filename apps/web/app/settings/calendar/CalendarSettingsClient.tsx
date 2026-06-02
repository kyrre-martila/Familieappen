"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CircleHelp, Copy, Link as LinkIcon, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import type { CalendarExportFeed, CalendarExportScope, CalendarImportSource, CalendarMvpEventIcon, CalendarViewMode } from "@familieappen/shared";

import { familyMembers } from "../../calendar/mockCalendarData";
import { Badge, Button, Card, PageContainer, SectionHeader } from "../../../components/ui";
import { PageHeader } from "../../../components/PageHeader";

type WeekStart = "monday";
type ReminderPreference = "none" | "15m" | "1h" | "1d";
type SyncFrequency = CalendarImportSource["syncFrequency"];

interface CalendarPreferences {
  defaultView: CalendarViewMode;
  weekStartsOn: WeekStart;
  showWeekNumbers: boolean;
  defaultReminder: ReminderPreference;
}

type CalendarImportDraft = Omit<CalendarImportSource, "id" | "lastSyncedAt">;

const initialPreferences: CalendarPreferences = {
  defaultView: "day",
  weekStartsOn: "monday",
  showWeekNumbers: true,
  defaultReminder: "15m",
};

const createMockExportToken = () => `mock-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;

function createMockPrivateUrl(token: string) {
  // TODO: Replace this mock URL with a backend ICS feed endpoint that uses an unguessable token.
  // The future feed endpoint should not require login because many calendar clients do not support authenticated ICS feeds.
  return `https://familieappen.no/calendar/feed/${token}.ics`;
}

function createInitialExportFeed(): CalendarExportFeed {
  const token = "PRIVATE-TOKEN";

  return {
    isEnabled: false,
    privateUrl: createMockPrivateUrl(token),
    token,
    includeEvents: true,
    includeMeals: true,
    includeReminders: true,
    scope: "family",
    selectedParticipantId: "fiona",
  };
}

const initialImportSources: CalendarImportSource[] = [
  {
    id: "fiona-spond-rg",
    name: "Fiona Spond RG",
    icsUrl: "https://spond.com/club/fiona-rg/calendar.ics",
    defaultParticipantId: "fiona",
    defaultIcon: "sport",
    syncFrequency: "automatic",
    lastSyncedAt: "I dag 08:30",
    isActive: true,
  },
];

const emptyImportDraft: CalendarImportDraft = {
  name: "",
  icsUrl: "",
  defaultParticipantId: "fiona",
  defaultIcon: "sport",
  syncFrequency: "automatic",
  isActive: true,
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
  { value: "sport", label: "Turn" },
  { value: "school", label: "Skole" },
  { value: "birthday", label: "Bursdag" },
  { value: "health", label: "Helse" },
  { value: "travel", label: "Reise" },
  { value: "family", label: "Familie" },
  { value: "meal", label: "Middag" },
] satisfies { value: CalendarMvpEventIcon; label: string }[];

const syncFrequencyOptions = [
  { value: "automatic", label: "Automatisk" },
  { value: "daily", label: "Daglig" },
  { value: "weekly", label: "Ukentlig" },
  { value: "manual", label: "Manuelt" },
] satisfies { value: SyncFrequency; label: string }[];

const exportScopeOptions = [
  { value: "family", label: "Hele familien" },
  { value: "mine", label: "Kun mine hendelser" },
  { value: "selectedParticipant", label: "Valgt familiemedlem" },
] satisfies { value: CalendarExportScope; label: string }[];

function getParticipantName(participantId: string) {
  return familyMembers.find((member) => member.id === participantId)?.name ?? "Ikke valgt";
}

function getIconLabel(icon: CalendarMvpEventIcon) {
  return iconOptions.find((option) => option.value === icon)?.label ?? icon;
}

function getSyncFrequencyLabel(syncFrequency: SyncFrequency) {
  return syncFrequencyOptions.find((option) => option.value === syncFrequency)?.label ?? syncFrequency;
}

function createImportId(name: string) {
  const fallbackId = `ics-${Date.now()}`;
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, "-")
    .replace(/^-|-$/g, "");

  return slug || fallbackId;
}

export function CalendarSettingsClient() {
  const [preferences, setPreferences] = useState<CalendarPreferences>(initialPreferences);
  const [imports, setImports] = useState<CalendarImportSource[]>(initialImportSources);
  const [exportFeed, setExportFeed] = useState<CalendarExportFeed>(() => createInitialExportFeed());
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [draft, setDraft] = useState<CalendarImportDraft>(emptyImportDraft);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const isEditing = editingImportId !== null;
  const formTitle = isEditing ? "Rediger import" : "Legg til kalenderimport";
  const canSaveImport = draft.name.trim().length > 0 && draft.icsUrl.trim().length > 0;

  const activeImportCount = useMemo(() => imports.filter((source) => source.isActive).length, [imports]);

  function resetForm() {
    setDraft(emptyImportDraft);
    setEditingImportId(null);
    setIsFormOpen(false);
  }

  function openNewImportForm() {
    setDraft(emptyImportDraft);
    setEditingImportId(null);
    setIsFormOpen(true);
  }

  function openEditImportForm(source: CalendarImportSource) {
    setDraft({
      name: source.name,
      icsUrl: source.icsUrl,
      defaultParticipantId: source.defaultParticipantId,
      defaultIcon: source.defaultIcon,
      syncFrequency: source.syncFrequency,
      isActive: source.isActive,
    });
    setEditingImportId(source.id);
    setIsFormOpen(true);
  }

  function handleSaveImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSaveImport) {
      return;
    }

    if (editingImportId) {
      setImports((currentImports) =>
        currentImports.map((source) =>
          source.id === editingImportId
            ? {
                ...source,
                ...draft,
              }
            : source,
        ),
      );
      resetForm();
      return;
    }

    setImports((currentImports) => [
      ...currentImports,
      {
        ...draft,
        id: createImportId(draft.name),
        lastSyncedAt: "Ikke synkronisert ennå",
      },
    ]);
    resetForm();
  }

  function toggleImportActive(sourceId: string) {
    setImports((currentImports) =>
      currentImports.map((source) =>
        source.id === sourceId ? { ...source, isActive: !source.isActive } : source,
      ),
    );
  }

  function syncImportNow(sourceId: string) {
    // TODO: Trigger real ICS sync job when backend support is implemented.
    setImports((currentImports) =>
      currentImports.map((source) =>
        source.id === sourceId ? { ...source, lastSyncedAt: "Akkurat nå" } : source,
      ),
    );
  }

  function removeImport(sourceId: string) {
    // TODO: Remove imported events from local calendar when backend source deletion exists.
    setImports((currentImports) => currentImports.filter((source) => source.id !== sourceId));
    if (editingImportId === sourceId) {
      resetForm();
    }
  }

  function updateExportFeed(updates: Partial<CalendarExportFeed>) {
    setCopyStatus("idle");
    setExportFeed((current) => ({ ...current, ...updates }));
  }

  function regenerateExportLink() {
    const token = createMockExportToken();

    setCopyStatus("idle");
    setExportFeed((current) => ({
      ...current,
      token,
      privateUrl: createMockPrivateUrl(token),
    }));
  }

  async function copyExportLink() {
    if (!exportFeed.isEnabled || typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportFeed.privateUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Innstillinger"
        title="Kalender"
        description="Velg hvordan kalenderen skal vises, og legg inn eksterne ICS-kalendere som skal dukke opp i FamilieAppen."
      />

      <section className="calendar-settings-section" aria-labelledby="calendar-preferences-title">
        <SectionHeader eyebrow="Kalender" title="Kalenderinnstillinger" />
        <Card className="calendar-settings-card">
          <div className="settings-fieldset" role="group" aria-labelledby="default-view-label">
            <div className="settings-fieldset__header">
              <span className="settings-label" id="default-view-label">Standardvisning</span>
              <span className="settings-help">Velges når kalenderen åpnes.</span>
            </div>
            <div className="segmented-control" role="radiogroup" aria-labelledby="default-view-label">
              {viewOptions.map((option) => (
                <label className="segmented-control__option" key={option.value}>
                  <input
                    type="radio"
                    name="defaultView"
                    value={option.value}
                    checked={preferences.defaultView === option.value}
                    onChange={() => setPreferences((current) => ({ ...current, defaultView: option.value }))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="settings-select-row" htmlFor="week-starts-on">
            <span>
              <span className="settings-label">Første dag i uken</span>
              <span className="settings-help">FamilieAppen bruker mandag som norsk kalenderstandard.</span>
            </span>
            <select
              id="week-starts-on"
              value={preferences.weekStartsOn}
              onChange={() => setPreferences((current) => ({ ...current, weekStartsOn: "monday" }))}
            >
              <option value="monday">Mandag</option>
            </select>
          </label>

          <label className="settings-toggle-row" htmlFor="show-week-numbers">
            <span>
              <span className="settings-label">Vis ukenummer</span>
              <span className="settings-help">Gjør det lettere å planlegge skole, ferie og aktiviteter.</span>
            </span>
            <input
              id="show-week-numbers"
              className="settings-toggle"
              type="checkbox"
              checked={preferences.showWeekNumbers}
              onChange={(event) => setPreferences((current) => ({ ...current, showWeekNumbers: event.target.checked }))}
            />
          </label>

          <label className="settings-select-row" htmlFor="default-reminder">
            <span>
              <span className="settings-label">Standard påminnelse</span>
              <span className="settings-help">Foreslås når nye hendelser opprettes.</span>
            </span>
            <select
              id="default-reminder"
              value={preferences.defaultReminder}
              onChange={(event) => setPreferences((current) => ({ ...current, defaultReminder: event.target.value as ReminderPreference }))}
            >
              {reminderOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </Card>
      </section>

      <section className="calendar-settings-section" aria-labelledby="calendar-export-title">
        <SectionHeader eyebrow="ICS" title="Eksporter kalender" />
        <Card className="calendar-export-card">
          <div className="calendar-export-card__intro">
            <div className="calendar-import-intro__icon" aria-hidden="true"><LinkIcon size={24} /></div>
            <div>
              <h3 id="calendar-export-title">Privat kalenderabonnement</h3>
              <p>Lag en privat kalenderlenke som kan abonneres på i Apple Kalender, Google Kalender eller Outlook.</p>
              <p className="calendar-export-card__mock-copy">Dette er en lokal/mock forhåndsvisning. Produksjonsklar ICS-feed og ekte synkronisering er ikke aktivert ennå.</p>
            </div>
            <Badge tone={exportFeed.isEnabled ? "success" : "neutral"}>{exportFeed.isEnabled ? "Aktiv" : "Inaktiv"}</Badge>
          </div>

          <label className="settings-toggle-row" htmlFor="calendar-export-enabled">
            <span>
              <span className="settings-label">Aktiver kalenderabonnement</span>
              <span className="settings-help">Gjør den private mock-lenken synlig for kalenderklienter når backend senere kobles på.</span>
            </span>
            <input
              id="calendar-export-enabled"
              className="settings-toggle"
              type="checkbox"
              checked={exportFeed.isEnabled}
              onChange={(event) => updateExportFeed({ isEnabled: event.target.checked })}
            />
          </label>

          <div className="calendar-export-url" aria-label="Privat kalenderlenke">
            <div>
              <span className="settings-label">Privat kalenderlenke</span>
              <span className="settings-help">URL-en må behandles som privat og deles bare med kalenderklienter/personer du stoler på.</span>
            </div>
            <code>{exportFeed.privateUrl}</code>
            <div className="calendar-export-url__actions">
              <Button variant="secondary" onClick={copyExportLink} disabled={!exportFeed.isEnabled}>
                <Copy aria-hidden="true" size={18} /> Kopier lenke
              </Button>
              <Button variant="secondary" onClick={regenerateExportLink}>
                <RefreshCw aria-hidden="true" size={18} /> Regenerer lenke
              </Button>
            </div>
            {copyStatus === "copied" ? <p className="calendar-export-url__status">Lenken er kopiert.</p> : null}
            {copyStatus === "failed" ? <p className="calendar-export-url__status calendar-export-url__status--error">Kunne ikke kopiere automatisk. Marker og kopier lenken manuelt.</p> : null}
          </div>

          <div className="calendar-export-warning" role="note">
            <ShieldAlert aria-hidden="true" size={20} />
            <p>Alle som har lenken kan se kalenderinnholdet du deler. Regenerer lenken hvis den har blitt delt med feil person.</p>
          </div>

          <div className="settings-fieldset" role="group" aria-labelledby="calendar-export-content-label">
            <div className="settings-fieldset__header">
              <span className="settings-label" id="calendar-export-content-label">Innhold i eksporten</span>
              <span className="settings-help">Velg hva den fremtidige ICS-feeden skal inkludere.</span>
            </div>
            <label className="settings-toggle-row" htmlFor="export-include-events">
              <span className="settings-label">Kalenderhendelser</span>
              <input id="export-include-events" className="settings-toggle" type="checkbox" checked={exportFeed.includeEvents} onChange={(event) => updateExportFeed({ includeEvents: event.target.checked })} />
            </label>
            <label className="settings-toggle-row" htmlFor="export-include-meals">
              <span className="settings-label">Inkluder middager</span>
              <input id="export-include-meals" className="settings-toggle" type="checkbox" checked={exportFeed.includeMeals} onChange={(event) => updateExportFeed({ includeMeals: event.target.checked })} />
            </label>
            <label className="settings-toggle-row" htmlFor="export-include-reminders">
              <span className="settings-label">Inkluder husk/oppgaver</span>
              <input id="export-include-reminders" className="settings-toggle" type="checkbox" checked={exportFeed.includeReminders} onChange={(event) => updateExportFeed({ includeReminders: event.target.checked })} />
            </label>
          </div>

          <div className="settings-fieldset" role="group" aria-labelledby="calendar-export-scope-label">
            <div className="settings-fieldset__header">
              <span className="settings-label" id="calendar-export-scope-label">Hvem kalenderen gjelder</span>
              <span className="settings-help">Avgrens hvilke hendelser den private lenken skal kunne vise.</span>
            </div>
            <div className="segmented-control segmented-control--export" role="radiogroup" aria-labelledby="calendar-export-scope-label">
              {exportScopeOptions.map((option) => (
                <label className="segmented-control__option" key={option.value}>
                  <input
                    type="radio"
                    name="calendarExportScope"
                    value={option.value}
                    checked={exportFeed.scope === option.value}
                    onChange={() => updateExportFeed({ scope: option.value })}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {exportFeed.scope === "selectedParticipant" ? (
              <label className="settings-select-row" htmlFor="export-selected-participant">
                <span>
                  <span className="settings-label">Valgt familiemedlem</span>
                  <span className="settings-help">Bare innhold knyttet til dette familiemedlemmet tas med.</span>
                </span>
                <select
                  id="export-selected-participant"
                  value={exportFeed.selectedParticipantId ?? ""}
                  onChange={(event) => updateExportFeed({ selectedParticipantId: event.target.value })}
                >
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="calendar-export-card__actions">
            <Button variant="ghost" onClick={() => updateExportFeed({ isEnabled: false })} disabled={!exportFeed.isEnabled}>Deaktiver eksport</Button>
          </div>
        </Card>
      </section>

      <section className="calendar-settings-section" aria-labelledby="calendar-imports-title">
        <SectionHeader
          eyebrow="ICS"
          title="Importer kalender"
          action={<Button variant="primary" onClick={openNewImportForm}><Plus aria-hidden="true" size={18} /> Legg til</Button>}
        />
        <Card className="calendar-import-intro" tone="soft">
          <div className="calendar-import-intro__icon" aria-hidden="true"><LinkIcon size={24} /></div>
          <div>
            <p className="calendar-import-intro__title">Legg til en ekstern kalender, for eksempel fra Spond, skole eller idrettslag.</p>
            <p className="calendar-import-intro__body">
              Importerte ICS-hendelser vises i FamilieAppen-kalenderen. Den eksterne kilden er fortsatt sannhet for tittel, tid og sted, mens FamilieAppen kan berike hendelser lokalt med standard deltaker og ikon/kategori.
            </p>
          </div>
          <Badge tone={activeImportCount > 0 ? "success" : "neutral"}>{activeImportCount} aktive</Badge>
        </Card>

        {isFormOpen ? (
          <Card className="calendar-import-form-card" tone="default">
            <form className="calendar-import-form" onSubmit={handleSaveImport}>
              <div className="calendar-import-form__header">
                <div>
                  <h3>{formTitle}</h3>
                  <p>Legg inn detaljene vi trenger for å vise importerte hendelser med riktig familie-kontekst.</p>
                </div>
                <Button variant="ghost" onClick={resetForm}>Avbryt</Button>
              </div>

              <div className="calendar-import-form__grid">
                <label className="form-field" htmlFor="import-name">
                  <span className="form-field__label">Navn</span>
                  <input
                    className="form-field__input"
                    id="import-name"
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Fiona Spond RG"
                  />
                </label>
                <label className="form-field" htmlFor="import-url">
                  <span className="form-field__label">ICS URL</span>
                  <input
                    className="form-field__input"
                    id="import-url"
                    type="url"
                    value={draft.icsUrl}
                    onChange={(event) => setDraft((current) => ({ ...current, icsUrl: event.target.value }))}
                    placeholder="https://.../calendar.ics"
                  />
                </label>
                <label className="form-field" htmlFor="default-participant">
                  <span className="form-field__label">Standard deltaker</span>
                  <select
                    className="form-field__input"
                    id="default-participant"
                    value={draft.defaultParticipantId}
                    onChange={(event) => setDraft((current) => ({ ...current, defaultParticipantId: event.target.value }))}
                  >
                    {familyMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field" htmlFor="default-icon">
                  <span className="form-field__label">Standard ikon/kategori</span>
                  <select
                    className="form-field__input"
                    id="default-icon"
                    value={draft.defaultIcon}
                    onChange={(event) => setDraft((current) => ({ ...current, defaultIcon: event.target.value as CalendarMvpEventIcon }))}
                  >
                    {iconOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field" htmlFor="sync-frequency">
                  <span className="form-field__label">Synkfrekvens</span>
                  <select
                    className="form-field__input"
                    id="sync-frequency"
                    value={draft.syncFrequency}
                    onChange={(event) => setDraft((current) => ({ ...current, syncFrequency: event.target.value as SyncFrequency }))}
                  >
                    {syncFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="settings-toggle-row settings-toggle-row--form" htmlFor="import-active">
                  <span>
                    <span className="settings-label">Aktiv import</span>
                    <span className="settings-help">Inaktive importer vises ikke i kalenderen.</span>
                  </span>
                  <input
                    id="import-active"
                    className="settings-toggle"
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
                  />
                </label>
              </div>

              <div className="calendar-import-form__actions">
                <Button variant="primary" type="submit" disabled={!canSaveImport}>Lagre import</Button>
              </div>
            </form>
          </Card>
        ) : null}

        <div className="calendar-import-list" aria-label="Importerte kalendere">
          {imports.map((source) => (
            <Card className="calendar-import-card" key={source.id} tone={source.isActive ? "default" : "soft"}>
              <div className="calendar-import-card__header">
                <div className="calendar-import-card__title-group">
                  <span className="calendar-import-card__icon" aria-hidden="true"><CalendarClock size={22} /></span>
                  <div>
                    <h3>{source.name}</h3>
                    <p>{source.icsUrl}</p>
                  </div>
                </div>
                <Badge tone={source.isActive ? "success" : "neutral"}>{source.isActive ? "Aktiv" : "Inaktiv"}</Badge>
              </div>

              <dl className="calendar-import-card__meta">
                <div>
                  <dt>Standard deltaker</dt>
                  <dd>{getParticipantName(source.defaultParticipantId)}</dd>
                </div>
                <div>
                  <dt>Standard ikon/kategori</dt>
                  <dd>{getIconLabel(source.defaultIcon)}</dd>
                </div>
                <div>
                  <dt>Synkfrekvens</dt>
                  <dd>{getSyncFrequencyLabel(source.syncFrequency)}</dd>
                </div>
                <div>
                  <dt>Sist synkronisert</dt>
                  <dd>{source.lastSyncedAt}</dd>
                </div>
              </dl>

              <div className="calendar-import-card__note">
                <CircleHelp aria-hidden="true" size={18} />
                <p>Du kan endre lokal deltaker og kategori her, men ikke tittel, tid eller sted fra den eksterne kalenderen.</p>
              </div>

              <div className="calendar-import-card__actions">
                <label className="calendar-import-card__toggle" htmlFor={`active-${source.id}`}>
                  <span>{source.isActive ? "Aktiv" : "Inaktiv"}</span>
                  <input
                    id={`active-${source.id}`}
                    className="settings-toggle"
                    type="checkbox"
                    checked={source.isActive}
                    onChange={() => toggleImportActive(source.id)}
                  />
                </label>
                <Button variant="secondary" onClick={() => syncImportNow(source.id)}><RefreshCw aria-hidden="true" size={18} /> Synkroniser nå</Button>
                <Button variant="secondary" onClick={() => openEditImportForm(source)}>Rediger</Button>
                <Button variant="ghost" onClick={() => removeImport(source.id)}><Trash2 aria-hidden="true" size={18} /> Fjern import</Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
