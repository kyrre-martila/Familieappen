"use client";

import { ArrowUpDown, MoreHorizontal, Plus, Utensils } from "lucide-react";

import { AppShell } from "../../components/AppShell";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Card, EmptyState, PageContainer } from "../../components/ui";
import {
  formatDateKey,
  getMealPlannerReminder,
  getMockMealPlannerTimeline,
  type MockMealPlannerDay,
} from "./mockMealPlannerData";

const today = new Date();
const todayKey = formatDateKey(today);
const timelineDays = getMockMealPlannerTimeline(today);
const reminder = getMealPlannerReminder(timelineDays, today);

const dateHeadingFormatter = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  weekday: "long",
});

function formatTimelineHeading(dateKey: string) {
  const date = parseDateKey(dateKey);
  const label = dateHeadingFormatter.format(date);

  if (dateKey === todayKey) {
    return `I dag · ${label}`;
  }

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function MealPlannerDay({ day }: { day: MockMealPlannerDay }) {
  return (
    <article className="meal-timeline__day" aria-labelledby={`meal-day-${day.date}`}>
      <div className="meal-timeline__marker" aria-hidden="true" />
      <div className="meal-timeline__content">
        <h2 className="meal-timeline__heading" id={`meal-day-${day.date}`}>
          {formatTimelineHeading(day.date)}
        </h2>
        {day.mealTitle ? <PlannedMealCard mealTitle={day.mealTitle} /> : <EmptyMealCta />}
      </div>
    </article>
  );
}

function PlannedMealCard({ mealTitle }: { mealTitle: string }) {
  return (
    <div className="meal-card">
      <div className="meal-card__visual" aria-hidden="true">
        <Utensils size={22} strokeWidth={2.1} />
      </div>
      <div className="meal-card__copy">
        <p className="meal-card__eyebrow">Middag</p>
        <p className="meal-card__title">{mealTitle}</p>
      </div>
      <button className="meal-card__menu" type="button" aria-label={`Flere valg for ${mealTitle}`}>
        <MoreHorizontal aria-hidden="true" size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function EmptyMealCta() {
  return (
    <button className="meal-empty-cta" type="button" aria-label="Legg til middag">
      <Plus aria-hidden="true" size={18} strokeWidth={2.3} />
      <span>Legg til middag</span>
    </button>
  );
}

export default function MealsPage() {
  const familyAccess = useFamilyAccess();

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <AppShell title="Måltidsplan">
        <PageContainer>
          <Card tone="default">
            <EmptyState
              title="Sjekker familietilgang"
              description="Vent litt mens vi bekrefter familietilknytningen din."
            />
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell title="Måltidsplan">
      <PageContainer>
        <section className="meal-planner" aria-label="Måltidsplan tidslinje">
          {reminder ? (
            <Card className="meal-reminder" tone="soft">
              <div className="meal-reminder__icon" aria-hidden="true">🍽️</div>
              <div className="meal-reminder__copy">
                <p className="meal-reminder__title">{reminder.title}</p>
                <p className="meal-reminder__description">{reminder.description}</p>
              </div>
            </Card>
          ) : null}

          <div className="meal-timeline" aria-label="Middager før og etter i dag">
            {timelineDays.map((day) => (
              <MealPlannerDay day={day} key={day.date} />
            ))}
          </div>

          <button className="meal-move-action" type="button" aria-label="Flytt middager (kommer senere)">
            <ArrowUpDown aria-hidden="true" size={18} strokeWidth={2.15} />
            <span>Flytt middager</span>
          </button>
        </section>
      </PageContainer>
    </AppShell>
  );
}
