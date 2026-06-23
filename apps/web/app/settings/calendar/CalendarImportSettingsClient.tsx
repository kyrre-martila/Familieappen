"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, CircleHelp, Link as LinkIcon, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { CalendarMvpEventIcon } from "@familieappen/shared";

import { useCalendar } from "../../../features/calendar/hooks/useCalendar";
import { useFamilyMembers } from "../../../features/family/hooks/useFamilyMembers";
import { Badge, Button, Card, SectionHeader } from "../../../components/ui";
import { SharedAudienceSelector } from "../../../features/husk/components/SharedAudienceSelector";
import {
  ApiError,
  createCalendarIcsSource,
  deleteCalendarIcsSource,
  getCalendarIcsSources,
  syncCalendarIcsSource,
  updateCalendarIcsSource,
  type CalendarIcsSource,
} from "../../../lib/api";

interface CalendarImportDraft {
  name: string;
  url: string;
  defaultFamilyMemberId: string | null;
  defaultCategory: CalendarMvpEventIcon;
  active: boolean;
}

const emptyImportDraft: CalendarImportDraft = {
  name: "",
  url: "",
  defaultFamilyMemberId: null,
  defaultCategory: "sport",
  active: true,
};

const iconOptions = [
  { value: "sport", label: "Sport" },
  { value: "school", label: "Skole" },
  { value: "birthday", label: "Bursdag" },
  { value: "health", label: "Helse" },
  { value: "travel", label: "Reise" },
  { value: "family", label: "Familie" },
  { value: "meal", label: "Middag" },
] satisfies { value: CalendarMvpEventIcon; label: string }[];

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
  return familyMembers.find((member) => member.id === participantId)?.name ?? "Ikke valgt";
}

function getIconLabel(icon: string) {
  return iconOptions.find((option) => option.value === icon)?.label ?? icon;
}

export function CalendarImportSettingsClient() {
  const { refresh: refreshCalendar } = useCalendar();
  const { family, familyMembers } = useFamilyMembers();
  const familyId = family?.id ?? null;
  const [imports, setImports] = useState<CalendarIcsSource[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<CalendarImportDraft>(emptyImportDraft);
  const [editingImportId, setEditingImportId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDefaultParticipantOpen, setIsDefaultParticipantOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isEditing = editingImportId !== null;
  const formTitle = isEditing ? "Rediger import" : "Legg til kalenderimport";
  const canSaveImport = Boolean(familyId) && draft.name.trim().length > 0 && draft.url.trim().length > 0;
  const activeImportCount = useMemo(() => imports.filter((source) => source.active).length, [imports]);

  const loadCalendarIcsSettings = useCallback(async () => {
    if (!familyId) return;
    setErrorMessage(null);
    try {
      const sources = await getCalendarIcsSources(familyId);
      setImports(sources);
      setDraft((current) => ({
        ...current,
        defaultFamilyMemberId: current.defaultFamilyMemberId ?? familyMembers[0]?.id ?? null,
      }));
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke hente ICS-innstillinger akkurat nå"));
    }
  }, [familyId, familyMembers]);

  useEffect(() => {
    void loadCalendarIcsSettings();
  }, [loadCalendarIcsSettings]);

  function resetForm() {
    setDraft({ ...emptyImportDraft, defaultFamilyMemberId: familyMembers[0]?.id ?? null });
    setEditingImportId(null);
    setIsFormOpen(false);
  }

  function openNewImportForm() {
    setDraft({ ...emptyImportDraft, defaultFamilyMemberId: familyMembers[0]?.id ?? null });
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
        editingImportId ? current.map((source) => (source.id === saved.id ? saved : source)) : [...current, saved],
      );
      setStatusMessage(
        editingImportId
          ? "Kalenderimporten er oppdatert."
          : "Kalenderimporten er lagt til. Trykk Synkroniser nå for å hente hendelser.",
      );
      resetForm();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke lagre kalenderimporten"));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleImportActive(source: CalendarIcsSource) {
    if (!familyId) return;
    setBusyId(source.id);
    try {
      const updated = await updateCalendarIcsSource(familyId, source.id, { active: !source.active });
      setImports((current) => current.map((item) => (item.id === source.id ? updated : item)));
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
      setImports((current) => current.map((source) => (source.id === sourceId ? result.source : source)));
      if (result.source.lastSyncStatus === "error") {
        setErrorMessage(result.source.lastSyncError ?? "Synkronisering feilet");
      } else {
        setStatusMessage(`Synkronisert: ${result.imported} nye, ${result.updated} oppdatert, ${result.removed} fjernet.`);
      }
      await refreshCalendar();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke synkronisere kalenderimporten"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeImport(sourceId: string) {
    if (!familyId) return;
    setBusyId(sourceId);
    try {
      await deleteCalendarIcsSource(familyId, sourceId);
      setImports((current) => current.filter((source) => source.id !== sourceId));
      if (editingImportId === sourceId) resetForm();
      await refreshCalendar();
    } catch (error) {
      setErrorMessage(getApiMessage(error, "Kunne ikke fjerne kalenderimporten"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="calendar-settings-section" aria-labelledby="calendar-imports-title">
      {statusMessage ? (
        <Card tone="soft" className="calendar-status"><p className="calendar-card__message">{statusMessage}</p></Card>
      ) : null}
      {errorMessage ? (
        <Card tone="warm" className="calendar-status"><p className="calendar-card__message">{errorMessage}</p></Card>
      ) : null}
      <SectionHeader
        eyebrow="ICS"
        title="Importer kalender"
        action={<Button variant="primary" onClick={openNewImportForm}><Plus aria-hidden="true" size={18} /> Legg til</Button>}
      />
      <Card className="calendar-import-intro" tone="soft">
        <div className="calendar-import-intro__icon" aria-hidden="true"><LinkIcon size={24} /></div>
        <div>
          <p className="calendar-import-intro__title">Legg til en ekstern kalender, for eksempel fra Spond, skole eller idrettslag.</p>
          <p className="calendar-import-intro__body">Importerte ICS-hendelser vises i FamilieAppen-kalenderen. Den eksterne kilden er sannhet for tittel, tid og sted, mens FamilieAppen kan berike hendelser med standard deltaker og ikon/kategori.</p>
        </div>
        <Badge tone={activeImportCount > 0 ? "success" : "neutral"}>{activeImportCount} aktive</Badge>
      </Card>
      {isFormOpen ? (
        <Card className="calendar-import-form-card" tone="default">
          <form className="calendar-import-form" onSubmit={handleSaveImport}>
            <div className="calendar-import-form__header"><div><h3>{formTitle}</h3><p>Legg inn detaljene vi trenger for å vise importerte hendelser med riktig familie-kontekst.</p></div><Button variant="ghost" onClick={resetForm}>Avbryt</Button></div>
            <div className="calendar-import-form__grid">
              <label className="form-field" htmlFor="import-name"><span className="form-field__label">Navn</span><input className="form-field__input" id="import-name" type="text" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Fiona Spond RG" /></label>
              <label className="form-field" htmlFor="import-url"><span className="form-field__label">ICS URL</span><input className="form-field__input" id="import-url" type="url" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://.../calendar.ics" /></label>
              <SharedAudienceSelector labelledBy="default-participant" isOpen={isDefaultParticipantOpen} members={familyMembers} onToggleOpen={() => setIsDefaultParticipantOpen((isOpen) => !isOpen)} selectedMemberIds={draft.defaultFamilyMemberId ? [draft.defaultFamilyMemberId] : []} setSelectedMemberIds={(value) => { const nextIds = typeof value === "function" ? value(draft.defaultFamilyMemberId ? [draft.defaultFamilyMemberId] : []) : value; setDraft((current) => ({ ...current, defaultFamilyMemberId: nextIds[0] ?? null })); }} title="Standard deltaker" singleSelect />
              <label className="form-field" htmlFor="default-icon"><span className="form-field__label">Standard ikon/kategori</span><select className="form-field__input" id="default-icon" value={draft.defaultCategory} onChange={(event) => setDraft((current) => ({ ...current, defaultCategory: event.target.value as CalendarMvpEventIcon }))}>{iconOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}</select></label>
              <label className="settings-toggle-row settings-toggle-row--form" htmlFor="import-active"><span><span className="settings-label">Aktiv import</span><span className="settings-help">Inaktive importer vises ikke i kalenderen.</span></span><input id="import-active" className="settings-toggle" type="checkbox" checked={draft.active} onChange={(event) => setDraft((current) => ({ ...current, active: event.target.checked }))} /></label>
            </div>
            <div className="calendar-import-form__actions"><Button variant="primary" type="submit" disabled={!canSaveImport || busyId === "form"}>Lagre import</Button></div>
          </form>
        </Card>
      ) : null}
      <div className="calendar-import-list" aria-label="Importerte kalendere">
        {imports.map((source) => (
          <Card className="calendar-import-card" key={source.id} tone={source.active ? "default" : "soft"}>
            <div className="calendar-import-card__header"><div className="calendar-import-card__title-group"><span className="calendar-import-card__icon" aria-hidden="true"><CalendarClock size={22} /></span><div><h3>{source.name}</h3><p>{source.url}</p></div></div><Badge tone={source.active ? "success" : "neutral"}>{source.active ? "Aktiv" : "Inaktiv"}</Badge></div>
            <dl className="calendar-import-card__meta"><div><dt>Standard deltaker</dt><dd>{getParticipantName(source.defaultFamilyMemberId, familyMembers)}</dd></div><div><dt>Standard ikon/kategori</dt><dd>{getIconLabel(source.defaultCategory)}</dd></div><div><dt>Synkstatus</dt><dd>{source.lastSyncStatus === "error" ? "Feil" : source.lastSyncStatus === "success" ? "OK" : "Ikke kjørt"}</dd></div><div><dt>Sist synkronisert</dt><dd>{formatLastSynced(source)}</dd></div></dl>
            {source.lastSyncError ? (<div className="calendar-import-card__note"><CircleHelp aria-hidden="true" size={18} /><p>{source.lastSyncError}</p></div>) : (<div className="calendar-import-card__note"><CircleHelp aria-hidden="true" size={18} /><p>Du kan endre lokal deltaker og kategori her, men ikke tittel, tid eller sted fra den eksterne kalenderen.</p></div>)}
            <div className="calendar-import-card__actions"><label className="calendar-import-card__toggle" htmlFor={`active-${source.id}`}><span>{source.active ? "Aktiv" : "Inaktiv"}</span><input id={`active-${source.id}`} className="settings-toggle" type="checkbox" checked={source.active} disabled={busyId === source.id} onChange={() => void toggleImportActive(source)} /></label><Button variant="secondary" onClick={() => void syncImportNow(source.id)} disabled={!source.active || busyId === source.id}><RefreshCw aria-hidden="true" size={18} /> Synkroniser nå</Button><Button variant="secondary" onClick={() => openEditImportForm(source)}>Rediger</Button><Button variant="ghost" onClick={() => void removeImport(source.id)} disabled={busyId === source.id}><Trash2 aria-hidden="true" size={18} /> Fjern import</Button></div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function CalendarImportSettingsPageClient() {
  return (
    <>
      <Link className="settings-back-link" href="/settings/calendar">← Tilbake til kalenderinnstillinger</Link>
      <h1 className="settings-page-title">Importerte kalendere</h1>
      <CalendarImportSettingsClient />
    </>
  );
}
