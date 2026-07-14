import { type ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { theme } from "../theme/tokens";
export function Card({ children, style, ...props }: ViewProps & { children: ReactNode }) { return <View style={[styles.card, style]} {...props}>{children}</View>; }
const styles = StyleSheet.create({ card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, padding: theme.spacing.lg, gap: theme.spacing.md, ...theme.shadow.card } });
