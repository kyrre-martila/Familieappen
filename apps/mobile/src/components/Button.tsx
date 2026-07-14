import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { AppText } from "./AppText";
import { theme } from "../theme/tokens";

export function Button({ title, variant = "primary", disabled, accessibilityState, style, ...props }: PressableProps & { title: string; variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled ?? false}
      style={({ pressed }) => [styles.base, styles[variant], disabled && styles.disabled, pressed && !disabled && styles.pressed, typeof style === "function" ? style({ pressed }) : style]}
      {...props}
    >
      <AppText style={[styles.text, variant !== "primary" && styles.secondaryText, disabled && styles.disabledText]}>{title}</AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({ base: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm }, primary: { backgroundColor: theme.colors.primaryStrong, borderRadius: theme.radius.md }, secondary: { backgroundColor: theme.colors.primarySoft }, ghost: { backgroundColor: "transparent" }, pressed: { opacity: 0.78 }, disabled: { backgroundColor: "#d7d2c8", opacity: 1 }, text: { color: theme.colors.surface, fontWeight: "800" }, secondaryText: { color: theme.colors.primaryStrong }, disabledText: { color: "#5f625c" } });
