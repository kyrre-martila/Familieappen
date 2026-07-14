import { Text, type TextProps, StyleSheet } from "react-native";
import { theme } from "../theme/tokens";

type Variant = "title" | "heading" | "lead" | "body" | "small" | "label";
export function AppText({ variant = "body", style, ...props }: TextProps & { variant?: Variant }) {
  return <Text allowFontScaling style={[styles.base, styles[variant], style]} {...props} />;
}
const styles = StyleSheet.create({
  base: { color: theme.colors.text, fontSize: theme.typography.body, lineHeight: 24 },
  title: { fontSize: theme.typography.title, lineHeight: 40, fontWeight: "800" },
  heading: { fontSize: theme.typography.heading, lineHeight: 32, fontWeight: "800" },
  lead: { fontSize: theme.typography.lead, lineHeight: 28 },
  body: { fontSize: theme.typography.body, lineHeight: 24 },
  small: { fontSize: theme.typography.small, lineHeight: 20 },
  label: { fontSize: theme.typography.small, lineHeight: 18, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, color: theme.colors.primary }
});
