export const tokens = {
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32
  },
  textSizes: {
    body: 16,
    title: 32,
    heading: 20,
    label: 13,
    small: 12
  },
  layout: {
    pageWidth: 1152,
    gutter: 20,
    contentGap: 16,
    sectionGap: 32
  },
  radius: {
    s: 8,
    m: 16,
    l: 24,
    pill: 999
  },
  colors: {
    background: "#fffaf3",
    backgroundSoft: "#f7f0e6",
    surface: "#ffffff",
    surfaceWarm: "#fbf6ee",
    text: "#222222",
    muted: "#666666",
    primary: "#2f6f73",
    primaryStrong: "#214f52",
    primarySoft: "#d9eeee",
    accent: "#f47b5f",
    accentSoft: "#ffe1d8",
    success: "#6f8f7a",
    successSoft: "#e5efe7",
    warning: "#bd7d35",
    warningSoft: "#fff0d8",
    border: "#eadfce",
    borderStrong: "#dccdb8"
  }
} as const;

export type DesignTokens = typeof tokens;
