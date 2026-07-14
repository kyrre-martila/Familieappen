import { tokens as sharedTokens } from "@familieappen/ui";

export const theme = {
  colors: {
    background: sharedTokens.colors.background,
    authBackground: "#fffaf3",
    heading: "#183f2a",
    surface: sharedTokens.colors.surface,
    surfaceWarm: sharedTokens.colors.surfaceWarm,
    text: sharedTokens.colors.text,
    textMuted: sharedTokens.colors.muted,
    primary: sharedTokens.colors.primary,
    primaryStrong: sharedTokens.colors.primaryStrong,
    primarySoft: sharedTokens.colors.primarySoft,
    border: sharedTokens.colors.border,
    inputBorder: "#ded8cf",
    inputBackground: "rgba(255,255,255,0.82)",
    placeholder: "#8d8d8d",
    error: "#b95045",
    errorSoft: "#ffe4df",
    success: sharedTokens.colors.success,
    successSoft: sharedTokens.colors.successSoft,
    warning: sharedTokens.colors.warning,
    warningSoft: sharedTokens.colors.warningSoft,
    accent: sharedTokens.colors.accent
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 },
  radius: { sm: 8, md: 16, lg: 24, pill: 999 },
  typography: { small: 13, body: 16, lead: 18, heading: 24, title: 34 },
  shadow: {
    card: { shadowColor: "#222222", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
    floating: { shadowColor: sharedTokens.colors.primaryStrong, shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 }
  }
} as const;
