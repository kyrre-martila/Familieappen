"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowUpDown, MoreHorizontal, Plus, Utensils } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { ProtectedFamilyRoute } from "../../components/ProtectedFamilyRoute";
import { PageContainer } from "../../components/ui";
import { getLatestPlannedOffset, getMockMealForOffset, type MockMeal } from "./mockMealPlanData";

const initialPastDays = 10;
const initialFutureDays = 21;
const loadChunkSize = 14;

const dayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" });
const futureDayFormatter = new Intl.DateTimeFormat("nb-NO", { weekday: "long" });

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setHours(12, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getToday() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function capitalize(value: string) {
  return value.length > 0 ? `${value.charAt(0).toLocaleUpperCase("nb-NO")}${value.slice(1)}` : value;
}

function formatTimelineDate(date: Date, offset: number) {
  if (offset === 0) {
    return `I dag · ${dayFormatter.format(date)}`;
  }

  if (offset === 1) {
    return `I morgen · ${dayFormatter.format(date)}`;
  }

  return capitalize(dayFormatter.format(date));
}

function formatReminderDate(today: Date, latestOffset: number) {
  const latestDate = addDays(today, latestOffset);
  if (latestOffset <= 1) {
    return latestOffset === 0 ? "i dag" : "i morgen";
  }

  if (latestOffset <= 7) {
    return futureDayFormatter.format(latestDate);
  }

  return dayFormatter.format(latestDate);
}

export default function MealsPage() {
  const [startOffset, setStartOffset] = useState(-initialPastDays);
  const [endOffset, setEndOffset] = useState(initialFutureDays);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const todayRef = useRef<HTMLElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const today = useMemo(() => getToday(), []);

  const days = useMemo(
    () =>
      Array.from({ length: endOffset - startOffset + 1 }, (_, index) => {
        const offset = startOffset + index;
        return {
          date: addDays(today, offset),
          offset,
          meal: getMockMealForOffset(offset),
        };
      }),
    [endOffset, startOffset, today]
  );

  const reminderText = useMemo(() => {
    const latestOffset = getLatestPlannedOffset();
    return `Du har planlagt frem til ${formatReminderDate(today, latestOffset)}`;
  }, [today]);

  useEffect(() => {
    if (hasInitialScrollRef.current) {
      return;
    }

    hasInitialScrollRef.current = true;
    window.requestAnimationFrame(() => {
      todayRef.current?.scrollIntoView({ block: "start" });
    });
  }, []);

  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;

    if (!topSentinel || !bottomSentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          if (entry.target === topSentinel) {
            setStartOffset((current) => current - loadChunkSize);
          }

          if (entry.target === bottomSentinel) {
            setEndOffset((current) => current + loadChunkSize);
          }
        });
      },
      { rootMargin: "320px 0px" }
    );

    observer.observe(topSentinel);
    observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <ProtectedFamilyRoute>
      <AppShell title="Måltidsplan">
        <PageContainer>
          <section className="meal-planner" aria-labelledby="meal-planner-title">
            <h2 className="sr-only" id="meal-planner-title">Måltidsplan</h2>

            <ReminderCard reminderText={reminderText} />

            <div className="meal-timeline" aria-label="Middag fremover og bakover i tid">
              <div className="meal-timeline__sentinel" ref={topSentinelRef} aria-hidden="true" />
              {days.map((day) => (
                <MealTimelineDay date={day.date} key={day.offset} meal={day.meal} offset={day.offset} todayRef={day.offset === 0 ? todayRef : undefined} />
              ))}
              <div className="meal-timeline__sentinel" ref={bottomSentinelRef} aria-hidden="true" />
            </div>

            <button className="meal-planner__move-button" type="button" aria-label="Flytt middager kommer senere">
              <ArrowUpDown aria-hidden="true" size={18} />
              Flytt middager
            </button>
          </section>
        </PageContainer>
      </AppShell>
    </ProtectedFamilyRoute>
  );
}

function ReminderCard({ reminderText }: { reminderText: string }) {
  return (
    <aside className="meal-reminder-card" aria-label="Påminnelse om måltidsplan">
      <span className="meal-reminder-card__icon" aria-hidden="true">🍽️</span>
      <div className="meal-reminder-card__copy">
        <p className="meal-reminder-card__title">Snart tomt for middager</p>
        <p className="meal-reminder-card__text">{reminderText}</p>
      </div>
    </aside>
  );
}

function MealTimelineDay({
  date,
  meal,
  offset,
  todayRef,
}: {
  date: Date;
  meal: MockMeal | null;
  offset: number;
  todayRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <article className="meal-day" aria-label={formatTimelineDate(date, offset)} ref={todayRef}>
      <div className="meal-day__rail" aria-hidden="true">
        <span className={offset === 0 ? "meal-day__dot meal-day__dot--today" : "meal-day__dot"} />
      </div>
      <div className="meal-day__content">
        <h3 className="meal-day__date">{formatTimelineDate(date, offset)}</h3>
        {meal ? <PlannedMealCard meal={meal} /> : <EmptyMealCta />}
      </div>
    </article>
  );
}

function PlannedMealCard({ meal }: { meal: MockMeal }) {
  return (
    <div className="meal-card">
      <span className="meal-card__visual" aria-hidden="true">
        <span>{meal.icon}</span>
      </span>
      <div className="meal-card__copy">
        <p className="meal-card__eyebrow">Middag</p>
        <p className="meal-card__title">{meal.title}</p>
      </div>
      <button className="meal-card__menu" type="button" aria-label={`Flere valg for ${meal.title}`}>
        <MoreHorizontal aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

function EmptyMealCta() {
  return (
    <button className="meal-empty-cta" type="button" aria-label="Legg til middag kommer senere">
      <Plus aria-hidden="true" size={17} />
      <span>Legg til middag</span>
      <Utensils className="meal-empty-cta__hint" aria-hidden="true" size={16} />
    </button>
  );
}
