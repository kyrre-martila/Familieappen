"use client";

import { useEffect, useMemo, useRef } from "react";
import { MoreHorizontal, Utensils } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { Badge, Card, PageContainer, SectionHeader } from "../../components/ui";

type MockMealDay = {
  id: string;
  date: string;
  mealName: string | null;
};

type TimelineDay = {
  date: string;
  meal: MockMealDay | null;
};

const MOCK_TODAY = "2026-06-03";

const MOCK_MEAL_DAYS: MockMealDay[] = [
  { id: "meal-2026-05-30", date: "2026-05-30", mealName: "Lasagne" },
  { id: "meal-2026-05-31", date: "2026-05-31", mealName: "Kjøttsuppe" },
  { id: "meal-2026-06-01", date: "2026-06-01", mealName: "Fiskekaker" },
  { id: "meal-2026-06-02", date: "2026-06-02", mealName: null },
  { id: "meal-2026-06-03", date: "2026-06-03", mealName: "Taco" },
  { id: "meal-2026-06-04", date: "2026-06-04", mealName: null },
  { id: "meal-2026-06-05", date: "2026-06-05", mealName: "Pizza" },
  { id: "meal-2026-06-06", date: "2026-06-06", mealName: "Fiskegrateng" },
  { id: "meal-2026-06-07", date: "2026-06-07", mealName: null },
  { id: "meal-2026-06-08", date: "2026-06-08", mealName: "Pasta med kylling" },
  { id: "meal-2026-06-09", date: "2026-06-09", mealName: null },
  { id: "meal-2026-06-10", date: "2026-06-10", mealName: "Hjemmelaget burger" },
];

const reminder = {
  description: "Du har planlagt frem til onsdag",
  title: "Snart tomt for middager 🍽️",
};

export default function MealsPage() {
  const todayRef = useRef<HTMLLIElement>(null);
  const timelineDays = useMemo(
    () => buildTimeline(MOCK_MEAL_DAYS, { afterToday: 6, beforeToday: 4 }),
    [],
  );

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <AppShell title="Måltidsplan">
      <PageContainer>
        <section className="meals-page meals-page--foundation" aria-labelledby="meals-title">
          <div className="meals-page__header">
            <div className="meals-page__copy">
              <Badge tone="accent">Måltidsplan</Badge>
              <h2 id="meals-title" className="meals-page__title">
                Hva spiser vi de neste dagene?
              </h2>
              <p className="meals-page__description">
                En rolig tidslinje som starter på i dag og lar familien se
                middagene fremover uten kalenderfølelse.
              </p>
            </div>
            <Badge tone="neutral">Mock/provider data</Badge>
          </div>

          <Card className="meals-reminder-card" tone="soft">
            <div className="meals-reminder-card__icon" aria-hidden="true">
              🍽️
            </div>
            <div>
              <p className="meals-reminder-card__title">{reminder.title}</p>
              <p className="meals-reminder-card__description">
                {reminder.description}
              </p>
            </div>
          </Card>

          <Card className="meals-card meals-timeline-card" tone="soft">
            <SectionHeader
              eyebrow="Tidslinje"
              title="Middager"
              action={<Badge tone="success">Starter i dag</Badge>}
            />

            <ul className="meals-timeline" aria-label="Måltidstidslinje">
              {timelineDays.map((day) => {
                const isToday = day.date === MOCK_TODAY;

                return (
                  <li
                    className="meals-timeline__item"
                    key={day.date}
                    ref={isToday ? todayRef : undefined}
                  >
                    <div
                      className="meals-timeline__date"
                      aria-label={formatFullDate(day.date)}
                    >
                      <span className="meals-timeline__weekday">
                        {formatTimelineEyebrow(day.date, isToday)}
                      </span>
                      <span className="meals-timeline__day">
                        {formatDayNumber(day.date)}
                      </span>
                    </div>

                    <div className="meals-timeline__content">
                      <p className="meals-timeline__heading">
                        {formatTimelineHeading(day.date, isToday)}
                      </p>
                      {day.meal ? <MealCard meal={day.meal} /> : <EmptyMealDay />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <button className="meals-move-action" type="button" aria-label="Flytt middager kommer senere">
            ↕ Flytt middager
          </button>
        </section>
      </PageContainer>
    </AppShell>
  );
}

function MealCard({ meal }: { meal: MockMealDay }) {
  return (
    <article className="meal-plan-card">
      <span className="meal-plan-card__visual" aria-hidden="true">
        <Utensils size={19} strokeWidth={2.4} />
      </span>
      <div className="meal-plan-card__body">
        <p className="meal-plan-card__label">Middag</p>
        <h3 className="meal-plan-card__title">{meal.mealName}</h3>
      </div>
      <button
        className="meal-plan-card__menu"
        type="button"
        aria-label={`Meny for ${meal.mealName} kommer senere`}
      >
        <MoreHorizontal size={21} strokeWidth={2.5} />
      </button>
    </article>
  );
}

function EmptyMealDay() {
  return (
    <button className="meal-empty-card" type="button" aria-label="Legg til middag kommer senere">
      <span className="meal-empty-card__plus" aria-hidden="true">
        +
      </span>
      <span>Legg til middag</span>
    </button>
  );
}

function buildTimeline(
  mealDays: MockMealDay[],
  visibleBuffer: { afterToday: number; beforeToday: number },
): TimelineDay[] {
  const mealDates = mealDays.map((meal) => parseDate(meal.date).getTime());
  const today = parseDate(MOCK_TODAY).getTime();
  const start = addDays(
    new Date(Math.min(today, ...mealDates)),
    -visibleBuffer.beforeToday,
  );
  const end = addDays(
    new Date(Math.max(today, ...mealDates)),
    visibleBuffer.afterToday,
  );
  const days: TimelineDay[] = [];

  for (const date = start; date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const isoDate = date.toISOString().slice(0, 10);
    const meal = mealDays.find(
      (mealDay) => mealDay.date === isoDate && mealDay.mealName,
    );

    days.push({ date: isoDate, meal: meal ?? null });
  }

  return days;
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function formatFullDate(date: string): string {
  return parseDate(date).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  });
}

function formatTimelineEyebrow(date: string, isToday: boolean): string {
  if (isToday) {
    return "I dag";
  }

  return parseDate(date).toLocaleDateString("nb-NO", {
    timeZone: "UTC",
    weekday: "short",
  });
}

function formatTimelineHeading(date: string, isToday: boolean): string {
  const label = parseDate(date).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    weekday: "long",
  });

  return isToday ? `I dag · ${label}` : capitalizeDateLabel(label);
}

function formatDayNumber(date: string): string {
  return parseDate(date).toLocaleDateString("nb-NO", {
    day: "2-digit",
    timeZone: "UTC",
  });
}

function capitalizeDateLabel(label: string) {
  return label.charAt(0).toLocaleUpperCase("nb-NO") + label.slice(1);
}
