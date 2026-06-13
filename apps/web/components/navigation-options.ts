export const bottomNavigationItems = [
  { href: "/dashboard", label: "Hjem", icon: "home" },
  { href: "/calendar", label: "Kalender", icon: "calendar" },
  { href: "/husk?tab=paminnelser", label: "Husk", icon: "check" },
  { href: "/menu", label: "Meny", icon: "menu" }
] as const;

export const menuNavigationItems = [
  { href: "/dashboard", label: "Hjem", description: "Familiens oversikt", icon: "home" },
  { href: "/calendar", label: "Kalender", description: "Planer og avtaler", icon: "calendar" },
  { href: "/husk?tab=paminnelser", label: "Husk", description: "Påminnelser, oppgaver og skoleuka", icon: "check" },
  { href: "/shopping", label: "Handleliste", description: "Dagligvarer og butikkrunde", icon: "shopping" },
  { href: "/lister", label: "Lister", description: "Pakkelister, ferie, bursdag og sjekklister", icon: "list" },
  { href: "/meals", label: "Middag", description: "Planlegg familiens middager", icon: "meal" },
  { href: "/wishlist", label: "Ønskeliste", description: "Gaver og ønsker", icon: "gift" },
  { href: "/settings", label: "Innstillinger", description: "Profil, familie og varsler", icon: "settings" }
] as const;

export const defaultCreateOptions = [
  { emoji: "📅", label: "Ny kalenderhendelse", description: "Opprett en rolig kalenderhendelse", href: "/calendar/events/new", tone: "calendar" },
  { emoji: "📝", label: "Ny påminnelse", description: "Lett påminnelse uten klokkeslett", href: "/husk/reminders/new", tone: "task" },
  { emoji: "✅", label: "Ny oppgave", description: "Legg til en oppgave under Husk", href: "/husk?tab=oppgaver", tone: "task" },
  { emoji: "🍽️", label: "Legg til middag", description: "Planlegg måltid", href: "/meals?create=1", tone: "meal" },
  { emoji: "🎁", label: "Legg til i ønskeliste", description: "Legg til ønske", href: "/wishlist", tone: "wish" }
] as const;

export const huskCreateOptions = [
  { emoji: "📝", label: "Ny påminnelse", description: "Lett påminnelse uten klokkeslett", href: "/husk/reminders/new", tone: "task" },
  { emoji: "✅", label: "Ny oppgave", description: "Legg til en oppgave under Husk", href: "/husk?tab=oppgaver", tone: "task" },
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
