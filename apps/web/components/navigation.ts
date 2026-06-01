export const bottomNavigationItems = [
  { href: "/dashboard", label: "Hjem", icon: "home" },
  { href: "/calendar", label: "Kalender", icon: "calendar" },
  { href: "/husk", label: "Husk", icon: "check" },
  { href: "/menu", label: "Meny", icon: "menu" }
] as const;

export const createOptions = [
  { emoji: "📅", label: "Ny kalenderhendelse", description: "Oppretter ny hendelse", tone: "calendar" },
  { emoji: "📝", label: "Ny oppgave / husk", description: "Oppretter ny husk/oppgave", tone: "task" },
  { emoji: "🛒", label: "Legg til i handleliste", description: "Legg til vare", tone: "shopping" },
  { emoji: "🍽️", label: "Planlegg middag", description: "Planlegg måltid", tone: "meal" },
  { emoji: "🎁", label: "Legg til i ønskeliste", description: "Legg til ønske", tone: "wish" }
] as const;
