"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, PageContainer, SectionHeader } from "../../components/ui";
import {
  ApiError,
  FamilyWithMembership,
  MealPlan,
  MealPlanDay,
  addMealPlanDay,
  clearActiveFamilyId,
  clearAuthSession,
  deleteMealPlanDay,
  getAccessToken,
  getActiveFamilyId,
  getMealPlan,
  listFamilies,
  setActiveFamilyId,
  updateMealPlanDay
} from "../../lib/api";

type MealsStatus = "loading" | "ready" | "unauthorized" | "no-family" | "error";

export default function MealsPage() {
  const router = useRouter();
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<MealsStatus>("loading");
  const [message, setMessage] = useState("Loading meal plan…");
  const [selectedMonth, setSelectedMonth] = useState(getMonthInputValue(new Date()));
  const [date, setDate] = useState(getDateInputValue(new Date()));
  const [mealName, setMealName] = useState("");
  const [notes, setNotes] = useState("");
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      clearAuthSession();
      router.replace("/login");
      return;
    }

    void bootstrapMeals();
  }, [router]);

  const visibleDays = useMemo(() => {
    const days = mealPlan?.days ?? [];

    return days.filter((day) => day.date.startsWith(selectedMonth)).sort(sortMealDays);
  }, [mealPlan, selectedMonth]);
  const plannedDays = visibleDays.length;
  const hasMultipleFamilies = families.length > 1;
  const formTitle = editingDayId ? "Edit dinner" : "Add dinner";

  async function bootstrapMeals() {
    setStatus("loading");
    setMessage("Loading meal plan…");

    try {
      const userFamilies = await listFamilies();
      setFamilies(userFamilies);

      if (userFamilies.length === 0) {
        clearActiveFamilyId();
        setActiveFamilyIdState(null);
        setMealPlan(null);
        setStatus("no-family");
        setMessage("Create a family before planning dinners.");
        return;
      }

      const storedFamilyId = getActiveFamilyId();
      const nextFamily = userFamilies.find((family) => family.family.id === storedFamilyId) ?? userFamilies[0];
      setActiveFamilyId(nextFamily.family.id);
      setActiveFamilyIdState(nextFamily.family.id);
      await loadMeals(nextFamily.family.id);
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function loadMeals(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Choose a family before opening meals.");
      return;
    }

    setStatus("loading");
    setMessage("Loading meal plan…");

    try {
      const nextMealPlan = await getMealPlan(familyId);
      setMealPlan(nextMealPlan);
      setStatus("ready");
      setMessage("");
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function handleFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
    const familyId = event.target.value;
    setActiveFamilyId(familyId);
    setActiveFamilyIdState(familyId);
    clearForm();
    await loadMeals(familyId);
  }

  async function handleSaveMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMealName = mealName.trim();
    const nextNotes = notes.trim();

    if (!activeFamilyId || !date || nextMealName.length === 0 || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (editingDayId) {
        const updatedDay = await updateMealPlanDay(activeFamilyId, editingDayId, {
          date,
          mealName: nextMealName,
          notes: nextNotes
        });
        upsertLocalDay(updatedDay);
        setMessage("Dinner updated.");
      } else {
        const createdDay = await addMealPlanDay(activeFamilyId, {
          date,
          mealName: nextMealName,
          notes: nextNotes
        });
        upsertLocalDay(createdDay);
        setMessage("Dinner planned.");
      }

      clearForm();
    } catch (error) {
      handleActionError(error, "Could not save dinner. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteMeal(dayId: string) {
    if (!activeFamilyId || pendingDayId) {
      return;
    }

    setPendingDayId(dayId);
    setMessage("");

    try {
      await deleteMealPlanDay(activeFamilyId, dayId);
      setMealPlan((current) =>
        current
          ? {
              ...current,
              days: current.days.filter((day) => day.id !== dayId),
              recentMeals: getRecentMeals(current.days.filter((day) => day.id !== dayId))
            }
          : current
      );
      if (editingDayId === dayId) {
        clearForm();
      }
      setMessage("Dinner removed.");
    } catch (error) {
      handleActionError(error, "Could not delete dinner. Please try again.");
    } finally {
      setPendingDayId(null);
    }
  }

  function handleEditMeal(day: MealPlanDay) {
    setEditingDayId(day.id);
    setDate(day.date);
    setMealName(day.mealName);
    setNotes(day.notes ?? "");
    setMessage("");
  }

  function handleFavoriteClick(favoriteMealName: string) {
    setMealName(favoriteMealName);
    setMessage("");
  }

  function upsertLocalDay(day: MealPlanDay) {
    setMealPlan((current) => {
      if (!current) {
        return current;
      }

      const nextDays = [day, ...current.days.filter((currentDay) => currentDay.id !== day.id && currentDay.date !== day.date)].sort(sortMealDays);

      return {
        ...current,
        days: nextDays,
        recentMeals: getRecentMeals(nextDays)
      };
    });
  }

  function clearForm() {
    setEditingDayId(null);
    setDate(getDateInputValue(new Date()));
    setMealName("");
    setNotes("");
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      setMealPlan(null);
      setStatus("unauthorized");
      setMessage("Your session has expired. Please sign in again.");
      router.replace("/login");
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setMealPlan(null);
      setActiveFamilyIdState(null);
      setStatus("error");
      setMessage("That family could not be loaded for your account. Please choose another family.");
      return;
    }

    setMealPlan(null);
    setStatus("error");
    setMessage("Could not load meals right now. Please try again.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession();
      router.replace("/login");
      return;
    }

    setMessage(error instanceof ApiError ? error.message : fallbackMessage);
  }

  return (
    <PageContainer>
      <section className="meals-page" aria-labelledby="meals-title">
        <div className="meals-page__header">
          <div className="meals-page__copy">
            <Badge tone="accent">Dinner planning</Badge>
            <h1 id="meals-title" className="meals-page__title">
              Meals
            </h1>
            <p className="meals-page__description">Plan simple text dinners for the current month. No recipes, no grocery automation.</p>
          </div>
          {hasMultipleFamilies ? (
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
        </div>

        {status !== "ready" && status !== "loading" ? <MealsStatusCard message={message} onRetry={() => bootstrapMeals()} status={status} /> : null}

        <div className="meals-layout">
          <Card className="meals-card" tone="warm">
            <SectionHeader action={<Badge tone="neutral">{formTitle}</Badge>} eyebrow="Quick plan" title="What are we eating?" />
            {status === "ready" ? (
              <form className="meals-form" onSubmit={handleSaveMeal}>
                <label className="meals-form__field">
                  <span className="meals-form__label">Date</span>
                  <input className="meals-form__input" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
                </label>
                <label className="meals-form__field meals-form__field--meal">
                  <span className="meals-form__label">Dinner</span>
                  <input
                    className="meals-form__input"
                    maxLength={120}
                    onChange={(event) => setMealName(event.target.value)}
                    placeholder="Taco"
                    value={mealName}
                  />
                </label>
                <label className="meals-form__field meals-form__field--notes">
                  <span className="meals-form__label">Notes</span>
                  <input
                    className="meals-form__input"
                    maxLength={500}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional note"
                    value={notes}
                  />
                </label>
                <div className="meals-form__actions">
                  {editingDayId ? (
                    <Button disabled={isSaving} onClick={clearForm} variant="ghost">
                      Cancel
                    </Button>
                  ) : null}
                  <Button disabled={isSaving || mealName.trim().length === 0 || !date} type="submit" variant="primary">
                    {editingDayId ? "Save dinner" : "+ Add dinner"}
                  </Button>
                </div>
              </form>
            ) : (
              <EmptyState title="Loading meal form" description="Meal planning will be ready in a moment." />
            )}

            {mealPlan?.recentMeals.length ? (
              <div className="recent-meals" aria-label="Recent meals">
                <p className="recent-meals__title">Recent meals</p>
                <div className="recent-meals__list">
                  {mealPlan.recentMeals.map((recentMeal) => (
                    <button className="recent-meals__button" key={recentMeal} onClick={() => handleFavoriteClick(recentMeal)} type="button">
                      {recentMeal}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {message && status === "ready" ? <p className="meals-card__message">{message}</p> : null}
          </Card>

          <Card className="meals-card" tone="soft">
            <SectionHeader
              action={<Badge tone="neutral">{plannedDays} planned</Badge>}
              eyebrow="Month"
              title={formatMonthTitle(selectedMonth)}
            />
            <label className="meals-month">
              <span className="meals-month__label">Show month</span>
              <input className="meals-form__input" onChange={(event) => setSelectedMonth(event.target.value)} type="month" value={selectedMonth} />
            </label>

            {status === "loading" ? <EmptyState title="Loading meals" description="Fetching the family dinner plan." /> : null}

            {status === "ready" && visibleDays.length === 0 ? (
              <EmptyState title="No dinners planned this month" description="Add a simple dinner like Taco, Pasta, or Frozen pizza." />
            ) : null}

            {status === "ready" && visibleDays.length > 0 ? (
              <ul className="meals-list" aria-label="Monthly dinner plan">
                {visibleDays.map((day) => (
                  <li className="meals-list__item" key={day.id}>
                    <div className="meals-list__date">
                      <span className="meals-list__weekday">{formatWeekday(day.date)}</span>
                      <span className="meals-list__day">{formatDay(day.date)}</span>
                    </div>
                    <div className="meals-list__content">
                      <span className="meals-list__meal">{day.mealName}</span>
                      {day.notes ? <span className="meals-list__notes">{day.notes}</span> : null}
                    </div>
                    <div className="meals-list__actions">
                      <button className="meals-list__button" disabled={pendingDayId === day.id} onClick={() => handleEditMeal(day)} type="button">
                        Edit
                      </button>
                      <button className="meals-list__button" disabled={pendingDayId === day.id} onClick={() => handleDeleteMeal(day.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}

function MealsStatusCard({ message, onRetry, status }: { message: string; onRetry: () => void; status: MealsStatus }) {
  if (status === "unauthorized") {
    return (
      <div className="meals-status">
        <EmptyState title="Please sign in again" description={message} />
        <Link className="button button--primary" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  if (status === "no-family") {
    return (
      <div className="meals-status">
        <EmptyState title="Create your first family" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Create family
        </Link>
      </div>
    );
  }

  return (
    <div className="meals-status">
      <EmptyState title="Meals could not load" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function getDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthInputValue(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function formatMonthTitle(monthValue: string): string {
  return new Date(`${monthValue}-01T00:00:00.000Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

function sortMealDays(first: MealPlanDay, second: MealPlanDay) {
  return first.date.localeCompare(second.date);
}

function getRecentMeals(days: MealPlanDay[]): string[] {
  const recentMeals: string[] = [];

  for (const day of [...days].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())) {
    if (!recentMeals.includes(day.mealName)) {
      recentMeals.push(day.mealName);
    }

    if (recentMeals.length >= 5) {
      break;
    }
  }

  return recentMeals;
}
