export const navigationItems = [
  { href: "/", label: "Home", shortLabel: "Home", icon: "⌂" },
  { href: "/calendar", label: "Calendar", shortLabel: "Cal", icon: "◷" },
  { href: "/meals", label: "Dinner", shortLabel: "Food", icon: "◐" },
  { href: "/shopping", label: "Shopping", shortLabel: "Shop", icon: "□" },
  { href: "/tasks", label: "Tasks", shortLabel: "Tasks", icon: "✓" },
  { href: "/wishlists", label: "Wishlists", shortLabel: "Wish", icon: "♡" }
] as const;

export const utilityNavigationItems = [{ href: "/settings", label: "Settings", shortLabel: "More", icon: "⋯" }] as const;
