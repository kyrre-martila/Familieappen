"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bug, MessageSquare } from "lucide-react";

import packageJson from "../../package.json";
import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import { CalendarDayView } from "../../features/calendar/components/CalendarDayView";
import { CalendarMealChip } from "../../features/calendar/components/CalendarMealChip";
import { CalendarReminderSummaryChip } from "../../features/calendar/components/CalendarReminderChip";
import { CalendarSchoolWeekChip } from "../../features/calendar/components/CalendarSchoolWeekChip";
import { CalendarProvider, useCalendar } from "../../features/calendar/hooks/useCalendar";
import { getShoppingList, getTasks, type ShoppingList, type Task } from "../../lib/api";
import { FeedbackSheet } from "../settings/about/AppInfoSettingsClient";

type FeedbackType = "feedback" | "bug";

const appVersion = typeof packageJson.version === "string" && packageJson.version.trim() ? packageJson.version : "0.1.0";

function HomeContent() {
  const familyAccess = useFamilyAccess();
  const { error, loading, refresh, today } = useCalendar();
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [shoppingLoading, setShoppingLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [sheet, setSheet] = useState<FeedbackType | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const activeFamilyId = familyAccess.status === "approved" ? familyAccess.familyContext.activeFamilyId : null;

  useEffect(() => {
    if (!activeFamilyId) {
      setShoppingList(null);
      setShoppingLoading(false);
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    let cancelled = false;
    setShoppingLoading(true);
    setTasksLoading(true);

    getShoppingList(activeFamilyId)
      .then((list) => {
        if (!cancelled) setShoppingList(isShoppingList(list) ? list : null);
      })
      .catch(() => {
        if (!cancelled) setShoppingList(null);
      })
      .finally(() => {
        if (!cancelled) setShoppingLoading(false);
      });

    getTasks(activeFamilyId)
      .then((familyTasks) => {
        if (!cancelled) setTasks(Array.isArray(familyTasks) ? familyTasks : []);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFamilyId]);

  const uncheckedItems = useMemo(
    () => (Array.isArray(shoppingList?.items) ? shoppingList.items : []).filter((item) => !item.checked),
    [shoppingList],
  );
  const visibleShoppingItems = uncheckedItems.slice(0, 4);
  const remainingShoppingCount = Math.max(0, uncheckedItems.length - visibleShoppingItems.length);
  const openTasks = useMemo(
    () => (Array.isArray(tasks) ? tasks : []).filter((task) => !task.completed).sort(sortOpenTasks),
    [tasks],
  );
  const visibleTasks = openTasks.slice(0, 3);
  const remainingTaskCount = Math.max(0, openTasks.length - visibleTasks.length);

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Hjem" hideTitleRow>
        <PageContainer>
          <Card tone="default">
            <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Hjem" hideTitleRow>
      <PageContainer>
        <section className="home-dashboard" aria-label="Familiens oversikt for i dag">
          <Card className="home-card home-card--today home-card--calendar" tone="warm">
            <header className="home-today__header">
              <h1>I dag</h1>
              <p>{formatToday(today)}</p>
            </header>
            <HomeTodayChips selectedDate={today} missingShoppingCount={uncheckedItems.length} />
            {error ? (
              <EmptyState title="Kunne ikke hente kalenderen" description="Prøv igjen for å se dagens planer." />
            ) : loading ? (
              <EmptyState title="Henter dagens planer" description="Vent litt mens vi finner kalenderen." />
            ) : (
              <CalendarDayView selectedDate={today} showChips={false} emptyTitle="Rolig dag i dag" emptyDescription="Ingen hendelser foreløpig." />
            )}
            {error ? (
              <button className="button button--secondary" type="button" onClick={() => void refresh()}>
                Prøv igjen
              </button>
            ) : null}
            <Link className="home-card__text-link" href="/calendar">
              Gå til kalender →
            </Link>
          </Card>

          <Card className="home-card" tone="default">
            <div className="home-card__header-row">
              <SectionHeader eyebrow="Praktisk" title="Handleliste" action={uncheckedItems.length ? <Badge tone="neutral">{formatShoppingCount(uncheckedItems.length)}</Badge> : null} />
            </div>
            {shoppingLoading ? (
              <EmptyState title="Henter handlelisten" description="Ser etter varer familien mangler." />
            ) : visibleShoppingItems.length ? (
              <ul className="home-shopping-list" aria-label="Varer som mangler">
                {visibleShoppingItems.map((item) => (
                  <li key={item.id}>
                    <span aria-hidden="true">☐</span>
                    <span>{item.quantity ? `${item.label} · ${item.quantity}` : item.label}</span>
                  </li>
                ))}
                {remainingShoppingCount > 0 ? <li className="home-shopping-list__more">+{remainingShoppingCount} flere</li> : null}
              </ul>
            ) : (
              <div className="home-subtle-state">
                <p className="home-subtle-state__title">Ingen varer mangler akkurat nå</p>
                <p>Legg til varer når noe må handles.</p>
              </div>
            )}
            <Link className="home-card__text-link" href="/shopping">
              Gå til handleliste →
            </Link>
          </Card>

          <Link className="home-card-link" href="/husk?tab=oppgaver" aria-label="Gå til oppgaver">
            <Card className="home-card" tone="default">
              <div className="home-card__header-row">
                <SectionHeader eyebrow="Praktisk" title="Oppgaver" action={openTasks.length ? <Badge tone="neutral">{formatTaskCount(openTasks.length)}</Badge> : null} />
              </div>
              {tasksLoading ? (
                <EmptyState title="Henter oppgaver" description="Ser etter åpne oppgaver for familien." />
              ) : visibleTasks.length ? (
                <ul className="home-shopping-list" aria-label="Åpne oppgaver">
                  {visibleTasks.map((task) => (
                    <li key={task.id}>
                      <span aria-hidden="true">☐</span>
                      <span>{formatTaskSummary(task)}</span>
                    </li>
                  ))}
                  {remainingTaskCount > 0 ? <li className="home-shopping-list__more">+{remainingTaskCount} flere</li> : null}
                </ul>
              ) : (
                <div className="home-subtle-state">
                  <p className="home-subtle-state__title">Ingen oppgaver akkurat nå</p>
                  <p>Legg til oppgaver når noe må gjøres.</p>
                </div>
              )}
              <span className="home-card__text-link" aria-hidden="true">
                Gå til oppgaver →
              </span>
            </Card>
          </Link>

          <Card className="home-card" tone="soft">
            <SectionHeader eyebrow="Raskt videre" title="Snarveier" />
            <div className="home-shortcuts">
              <Link href="/calendar/events/new">Ny hendelse</Link>
              <Link href="/husk/reminders/new">Ny husk</Link>
              <Link href="/meals?create=1">Planlegg middag</Link>
              <Link href="/shopping">Legg til vare</Link>
            </div>
          </Card>

          <Card className="home-card home-card--beta" tone="soft">
            <SectionHeader eyebrow="Hjelp" title="Hjelp oss gjøre FamilieAppen bedre" action={<Badge tone="primary">BETA</Badge>} />
            <div className="home-feedback-actions">
              <button type="button" className="button button--secondary" onClick={() => { setFeedbackMessage(""); setSheet("feedback"); }}>
                <MessageSquare aria-hidden="true" size={18} /> Send tilbakemelding
              </button>
              <button type="button" className="button button--secondary" onClick={() => { setFeedbackMessage(""); setSheet("bug"); }}>
                <Bug aria-hidden="true" size={18} /> Rapporter feil
              </button>
            </div>
            {feedbackMessage ? <p className="home-feedback-success" role="status">{feedbackMessage}</p> : null}
          </Card>
        </section>
      </PageContainer>
      {sheet ? <FeedbackSheet type={sheet} version={appVersion} onCancel={() => setSheet(null)} onSent={(message) => { setSheet(null); setFeedbackMessage(message); }} /> : null}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <CalendarProvider>
      <HomeContent />
    </CalendarProvider>
  );
}


function HomeTodayChips({
  missingShoppingCount,
  selectedDate,
}: {
  missingShoppingCount: number;
  selectedDate: string;
}) {
  const { mealSummaries, normalizedItems, reminders } = useCalendar();
  const safeMealSummaries = Array.isArray(mealSummaries) ? mealSummaries : [];
  const safeNormalizedItems = Array.isArray(normalizedItems) ? normalizedItems : [];
  const safeReminders = Array.isArray(reminders) ? reminders : [];
  const meal = safeMealSummaries.find((item) => item?.date === selectedDate);
  const visibleReminders = safeReminders.filter((item) => item?.date === selectedDate);
  const schoolWeekItems = safeNormalizedItems.filter((item) => item?.date === selectedDate && item.type === "school-week");
  const hasShoppingChip = missingShoppingCount > 0;
  const chipCount = (meal ? 1 : 0) + visibleReminders.length + schoolWeekItems.length + (hasShoppingChip ? 1 : 0);

  if (chipCount === 0) return null;

  return (
    <section className={`calendar-summary-chips home-today__chips${chipCount === 1 ? " home-today__chips--single" : ""}`} aria-label="Det viktigste i dag">
      {meal ? <CalendarMealChip date={selectedDate} meal={meal} /> : null}
      {visibleReminders.map((reminder) => (
        <CalendarReminderSummaryChip
          ariaLabel={`Åpne påminnelser i Husk: ${reminder.title}`}
          href="/husk?tab=paminnelser"
          reminder={reminder}
          key={reminder.id}
        />
      ))}
      {schoolWeekItems.map((item) => (
        <CalendarSchoolWeekChip item={item} key={item.id} />
      ))}
      {hasShoppingChip ? (
        <Link className="calendar-chip home-shopping-chip" href="/shopping">
          <span aria-hidden="true">🛒</span>
          <span>{missingShoppingCount} {missingShoppingCount === 1 ? "vare" : "varer"} mangler</span>
        </Link>
      ) : null}
    </section>
  );
}

function formatToday(date: string) {
  const parsedDate = parseDashboardDate(date);
  return new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" }).format(parsedDate ?? new Date());
}

function formatShoppingCount(count: number) {
  return `${count} ${count === 1 ? "vare" : "varer"} mangler`;
}

function sortOpenTasks(first: Task, second: Task) {
  if (first.dueDate && second.dueDate && first.dueDate !== second.dueDate) {
    return first.dueDate.localeCompare(second.dueDate);
  }

  if (first.dueDate && !second.dueDate) return -1;
  if (!first.dueDate && second.dueDate) return 1;

  return (first.createdAt ?? "").localeCompare(second.createdAt ?? "");
}

function formatTaskSummary(task: Task) {
  const title = task.title?.trim() || "Oppgave uten tittel";
  return task.dueDate ? `${title} · ${formatTaskDueDate(task.dueDate)}` : title;
}

function formatTaskDueDate(date: string) {
  const parsedDate = parseDashboardDate(date);
  if (!parsedDate) return "uten dato";

  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(parsedDate);
}

function parseDashboardDate(date: string | null | undefined) {
  if (!date) return null;

  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function isShoppingList(list: ShoppingList | null | undefined): list is ShoppingList {
  return Boolean(list && Array.isArray(list.items));
}

function formatTaskCount(count: number) {
  return `${count} ${count === 1 ? "oppgave" : "oppgaver"}`;
}
