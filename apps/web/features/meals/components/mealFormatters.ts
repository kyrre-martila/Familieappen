const dayFormatter = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function capitalize(value: string) {
  return value.length > 0
    ? `${value.charAt(0).toLocaleUpperCase("nb-NO")}${value.slice(1)}`
    : value;
}

export function formatTimelineDate(date: Date, offset: number) {
  if (offset === 0) {
    return `I dag · ${dayFormatter.format(date)}`;
  }

  if (offset === 1) {
    return `I morgen · ${dayFormatter.format(date)}`;
  }

  return capitalize(dayFormatter.format(date));
}

export function normalizeMealTitle(value: string) {
  return value.trim().toLocaleLowerCase("nb-NO");
}
