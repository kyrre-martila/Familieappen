export const bottomNavigationItems = [
  { href: "/dashboard", label: "Hjem", icon: "home" },
  { href: "/calendar", label: "Kalender", icon: "calendar" },
  { href: "/wishlist", label: "Ønskeliste", icon: "gift" },
  { href: "/husk", label: "Husk", icon: "check" },
  { href: "/menu", label: "Meny", icon: "menu" }
] as const;

export const defaultCreateOptions = [
  { emoji: "📅", label: "Ny kalenderhendelse", description: "Opprett en rolig kalenderhendelse", href: "/calendar/events/new", tone: "calendar" },
  { emoji: "📝", label: "Ny husk", description: "Lett påminnelse uten klokkeslett", href: "/husk/reminders/new", tone: "task" },
  { emoji: "✅", label: "Ny liste", description: "Samle punkter for familien", href: "/husk/lister/new", tone: "shopping" },
  { emoji: "🍽️", label: "Legg til middag", description: "Planlegg måltid", href: "/meals?create=1", tone: "meal" },
  { emoji: "🎁", label: "Legg til i ønskeliste", description: "Legg til ønske", href: "/wishlist", tone: "wish" }
] as const;

export const huskCreateOptions = [
  { emoji: "📝", label: "Ny husk", description: "Lett påminnelse uten klokkeslett", href: "/husk/reminders/new", tone: "task" },
  { emoji: "✅", label: "Ny liste", description: "Samle punkter for familien", href: "/husk/lister/new", tone: "shopping" },
  { emoji: "🎒", label: "Planlegg skoleuka", description: "Åpne skoleuka i redigering", href: "/husk?tab=skoleuka&edit=1&week=current&child=first", tone: "task" }
] as const;

export function getCreateOptions(isHuskContext: boolean) {
  if (!isHuskContext) {
    return defaultCreateOptions;
  }

  const huskLabels = new Set<string>(huskCreateOptions.map((option) => option.label));
  return [
    ...huskCreateOptions,
    ...defaultCreateOptions.filter((option) => !huskLabels.has(option.label))
  ];
}
