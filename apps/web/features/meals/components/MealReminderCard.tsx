export function MealReminderCard({ reminderText }: { reminderText: string }) {
  return (
    <aside
      className="meal-reminder-card"
      aria-label="Påminnelse om måltidsplan"
    >
      <span className="meal-reminder-card__icon" aria-hidden="true">
        🍽️
      </span>
      <div className="meal-reminder-card__copy">
        <p className="meal-reminder-card__title">Snart tomt for middager</p>
        <p className="meal-reminder-card__text">{reminderText}</p>
      </div>
    </aside>
  );
}
