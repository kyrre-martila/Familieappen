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
    title: 28,
    label: 14
  },
  layout: {
    pageWidth: 1120,
    gutter: 20,
    contentGap: 16,
    sectionGap: 32
  },
  radius: {
    s: 8,
    m: 16,
    pill: 999
  },
  colors: {
    background: "#fffaf3",
    surface: "#ffffff",
    text: "#222222",
    muted: "#666666",
    primary: "#2f6f73",
    primarySoft: "#d9eeee",
    border: "#eadfce"
  }
} as const;

export type DesignTokens = typeof tokens;
