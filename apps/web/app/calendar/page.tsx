"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, SectionHeader } from "../../components/ui";
import {
  CalendarEvent,
  FamilyMember,
  FamilyWithMembership,
  addCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  getFamily,
  updateCalendarEvent
} from "../../lib/api";
import { chooseActiveFamily, getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../lib/auth-family";

type CalendarStatus = "loading" | "ready" | "pending" | "unauthorized" | "no-family" | "error";

type EventFormState = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  participantFamilyMemberIds: string[];
};

const emptyForm: EventFormState = {
  title: "",
  description: "",
  location: "",
  startsAt: toDateTimeInputValue(new Date()),
  endsAt: "",
  allDay: false,
  participantFamilyMemberIds: []
};

export default function CalendarPage() {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<CalendarStatus>("loading");
  const [message, setMessage] = useState("Loading calendar…");
  const [rangeDays, setRangeDays] = useState(30);
  const [form, setForm] = useState<EventFormState>(emptyForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext = familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadCalendar(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext, rangeDays]);

  async function loadCalendar(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Choose a family before opening the calendar.");
      return;
    }

    setStatus("loading");
    setMessage("Loading calendar…");

    try {
      const { from, to } = getCalendarRange(rangeDays);

      const [familyDetails, calendarEvents] = await Promise.all([
        getFamily(familyId),
        getCalendarEvents(familyId, { from: from.toISOString(), to: to.toISOString() })
      ]);

      setMembers(familyDetails.members);
      setEvents(calendarEvents);
      setStatus("ready");
      setMessage("Calendar ready.");
    } catch (error) {
      if (handleMissingOrInvalidAuth(error, router)) {
        setStatus("unauthorized");
        setMessage(getUserFacingApiMessage(error, "Your session has expired. Please sign in again."));
        return;
      }

      setStatus("error");
      setMessage("Could not load the family calendar right now. Please try again.");
    }
  }

  async function handleFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
    const familyId = event.target.value;
    chooseActiveFamily(familyId);
    setActiveFamilyIdState(familyId);
    clearForm();
    await loadCalendar(familyId);
  }

  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setRangeDays(Number(event.target.value));
  }

  function updateField(field: keyof EventFormState, value: string | boolean | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAllDay(isAllDay: boolean) {
    setForm((current) => ({
      ...current,
      allDay: isAllDay,
      startsAt: isAllDay ? current.startsAt.slice(0, 10) : toDateTimeInputValue(new Date(`${current.startsAt}T00:00:00`)),
      endsAt: current.endsAt
        ? isAllDay
          ? current.endsAt.slice(0, 10)
          : toDateTimeInputValue(new Date(`${current.endsAt}T00:00:00`))
        : ""
    }));
  }

  function toggleParticipant(familyMemberId: string) {
    setForm((current) => ({
      ...current,
      participantFamilyMemberIds: current.participantFamilyMemberIds.includes(familyMemberId)
        ? current.participantFamilyMemberIds.filter((id) => id !== familyMemberId)
        : [...current.participantFamilyMemberIds, familyMemberId]
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamilyId) {
      return;
    }

    setIsSaving(true);
    setMessage(editingEventId ? "Updating event…" : "Adding event…");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        startsAt: form.allDay ? dateInputToIso(form.startsAt) : new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? (form.allDay ? dateInputToIso(form.endsAt) : new Date(form.endsAt).toISOString()) : undefined,
        allDay: form.allDay,
        participantFamilyMemberIds: form.participantFamilyMemberIds
      };

      if (editingEventId) {
        await updateCalendarEvent(activeFamilyId, editingEventId, payload);
      } else {
        await addCalendarEvent(activeFamilyId, payload);
      }

      clearForm();
      await loadCalendar(activeFamilyId);
    } catch (error) {
      setStatus("error");
      setMessage(getUserFacingApiMessage(error, "Could not save the event. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(event: CalendarEvent) {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      startsAt: event.allDay ? event.startsAt.slice(0, 10) : toDateTimeInputValue(new Date(event.startsAt)),
      endsAt: event.endsAt ? (event.allDay ? event.endsAt.slice(0, 10) : toDateTimeInputValue(new Date(event.endsAt))) : "",
      allDay: event.allDay,
      participantFamilyMemberIds: event.participants.map((participant) => participant.familyMemberId)
    });
  }

  async function handleDelete(eventId: string) {
    if (!activeFamilyId) {
      return;
    }

    setIsSaving(true);
    setMessage("Deleting event…");

    try {
      await deleteCalendarEvent(activeFamilyId, eventId);
      if (editingEventId === eventId) {
        clearForm();
      }
      await loadCalendar(activeFamilyId);
    } catch (error) {
      setStatus("error");
      setMessage(getUserFacingApiMessage(error, "Could not delete the event. Please try again."));
    } finally {
      setIsSaving(false);
    }
  }

  function clearForm() {
    setEditingEventId(null);
    setForm({ ...emptyForm, startsAt: toDateTimeInputValue(new Date()) });
  }

  const todayEvents = useMemo(() => events.filter(isTodayEvent), [events]);
  const upcomingEvents = useMemo(() => events.filter((event) => !isTodayEvent(event)), [events]);
  const activeFamilyName = families.find((family) => family.family.id === activeFamilyId)?.family.name ?? "Family calendar";
  const isLoading = status === "loading";

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <section className="calendar-page__header" aria-labelledby="calendar-title">
        <div className="calendar-page__copy">
          <Badge tone="primary">Family calendar</Badge>
          <h1 id="calendar-title" className="calendar-page__title">
            {activeFamilyName}
          </h1>
          <p className="calendar-page__description">
            Simple plans for what is happening today, where everyone needs to be, and who is involved.
          </p>
        </div>
        <div className="calendar-page__controls">
          {families.length > 1 ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Active family</span>
              <select className="family-switcher__select" value={activeFamilyId ?? ""} onChange={handleFamilyChange}>
                {families.map((family) => (
                  <option key={family.family.id} value={family.family.id}>
                    {family.family.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="calendar-range">
            <span className="calendar-range__label">Upcoming</span>
            <select className="calendar-range__select" value={rangeDays} onChange={handleRangeChange}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </label>
        </div>
      </section>

      {status !== "ready" ? <CalendarStatusCard message={message} status={status} onRetry={() => loadCalendar()} /> : null}

      <section className="calendar-layout" aria-busy={isLoading}>
        <Card className="calendar-card" tone="warm">
          <SectionHeader eyebrow="Add event" title={editingEventId ? "Edit family event" : "New family event"} />
          <form className="calendar-form" onSubmit={handleSubmit}>
            <label className="calendar-form__field calendar-form__field--title">
              <span className="calendar-form__label">Title</span>
              <input
                className="calendar-form__input"
                maxLength={120}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Fotballtrening"
                required
                value={form.title}
              />
            </label>

            <label className="calendar-form__field">
              <span className="calendar-form__label">Location</span>
              <input
                className="calendar-form__input"
                maxLength={160}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Sporthallen"
                value={form.location}
              />
            </label>

            <label className="calendar-form__field calendar-form__field--description">
              <span className="calendar-form__label">Notes</span>
              <textarea
                className="calendar-form__input calendar-form__input--textarea"
                maxLength={500}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Ta med vannflaske og leggskinn"
                rows={3}
                value={form.description}
              />
            </label>

            <label className="calendar-form__check">
              <input checked={form.allDay} onChange={(event) => toggleAllDay(event.target.checked)} type="checkbox" />
              <span>All-day event</span>
            </label>

            <label className="calendar-form__field">
              <span className="calendar-form__label">Starts</span>
              <input
                className="calendar-form__input"
                onChange={(event) => updateField("startsAt", event.target.value)}
                required
                type={form.allDay ? "date" : "datetime-local"}
                value={form.startsAt}
              />
            </label>

            <label className="calendar-form__field">
              <span className="calendar-form__label">Ends</span>
              <input
                className="calendar-form__input"
                onChange={(event) => updateField("endsAt", event.target.value)}
                type={form.allDay ? "date" : "datetime-local"}
                value={form.endsAt}
              />
            </label>

            <fieldset className="calendar-participants">
              <legend className="calendar-participants__legend">Who is involved?</legend>
              {members.length ? (
                <div className="calendar-participants__list">
                  {members.map((member) => (
                    <label className="calendar-participants__item" key={member.id}>
                      <input
                        checked={form.participantFamilyMemberIds.includes(member.id)}
                        onChange={() => toggleParticipant(member.id)}
                        type="checkbox"
                      />
                      <span>{member.displayName}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="calendar-card__message">Add family members before assigning participants.</p>
              )}
            </fieldset>

            {status === "error" ? <p className="form-message form-message--error">{message}</p> : null}

            <div className="calendar-form__actions">
              {editingEventId ? (
                <Button disabled={isSaving} variant="ghost" onClick={clearForm}>
                  Cancel edit
                </Button>
              ) : null}
              <Button className="calendar-form__button" disabled={isSaving} type="submit" variant="primary">
                {isSaving ? "Saving…" : editingEventId ? "Save changes" : "Add event"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="calendar-events">
          <Card className="calendar-card" tone="soft">
            <SectionHeader action={<Badge tone="neutral">{todayEvents.length} today</Badge>} eyebrow="Today" title="What is happening today?" />
            {todayEvents.length ? (
              <EventList events={todayEvents} isSaving={isSaving} onDelete={handleDelete} onEdit={startEditing} />
            ) : (
              <EmptyState title="No events today" description="No events today. Add plans when something needs coordination." />
            )}
          </Card>

          <Card className="calendar-card" tone="default">
            <SectionHeader action={<Badge tone="neutral">{upcomingEvents.length} upcoming</Badge>} eyebrow="Upcoming" title="What is next?" />
            {upcomingEvents.length ? (
              <EventList events={upcomingEvents} isSaving={isSaving} onDelete={handleDelete} onEdit={startEditing} />
            ) : (
              <EmptyState title="No upcoming events" description="Add school, sport, and family plans as they come up." />
            )}
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}

function CalendarStatusCard({ message, status, onRetry }: { message: string; status: CalendarStatus; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <Card className="calendar-status" tone="default">
        <LoadingState title="Loading calendar" description={message} />
      </Card>
    );
  }

  if (status === "unauthorized") {
    return (
      <Card className="calendar-status" tone="default">
        <EmptyState title="Please sign in again" description={message} />
        <Link className="button button--primary" href="/login">
          Go to login
        </Link>
      </Card>
    );
  }

  if (status === "no-family") {
    return (
      <Card className="calendar-status" tone="default">
        <EmptyState title="Create your first family" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Create family
        </Link>
      </Card>
    );
  }

  return (
    <Card className="calendar-status" tone="default">
      <ErrorState title="Calendar could not load" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

function EventList({
  events,
  isSaving,
  onDelete,
  onEdit
}: {
  events: CalendarEvent[];
  isSaving: boolean;
  onDelete: (eventId: string) => void;
  onEdit: (event: CalendarEvent) => void;
}) {
  return (
    <ul className="calendar-list" aria-label="Calendar events">
      {events.map((event) => (
        <li className="calendar-list__item" key={event.id}>
          <div className="calendar-list__time">{formatEventTime(event)}</div>
          <div className="calendar-list__content">
            <p className="calendar-list__title">{event.title}</p>
            {event.location ? <p className="calendar-list__meta">{event.location}</p> : null}
            <p className="calendar-list__meta">{formatParticipants(event)}</p>
          </div>
          <div className="calendar-list__actions">
            <button className="calendar-list__button" disabled={isSaving} onClick={() => onEdit(event)} type="button">
              Edit
            </button>
            <button className="calendar-list__button" disabled={isSaving} onClick={() => onDelete(event.id)} type="button">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function getCalendarRange(days: number): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function isTodayEvent(event: CalendarEvent): boolean {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const startsAt = new Date(event.startsAt);
  const endsAt = event.endsAt ? new Date(event.endsAt) : startsAt;

  return startsAt < tomorrowStart && endsAt >= todayStart;
}

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return "All day";
  }

  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt));
}

function formatParticipants(event: CalendarEvent): string {
  if (!event.participants.length) {
    return "Whole family";
  }

  return event.participants.map((participant) => participant.familyMember.displayName).join(", ");
}

function toDateTimeInputValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return offsetDate.toISOString().slice(0, 16);
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00`).toISOString();
}
