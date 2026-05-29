import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@familieappen/ui";

interface ScreenShellProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ScreenShell({ title, description, children }: ScreenShellProps) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>FamilieAppen</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: tokens.layout.gutter,
    justifyContent: "center"
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.m,
    borderWidth: 1,
    gap: tokens.layout.contentGap,
    padding: tokens.spacing.l
  },
  eyebrow: {
    color: tokens.colors.primary,
    fontSize: tokens.textSizes.label,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: tokens.colors.text,
    fontSize: tokens.textSizes.title,
    fontWeight: "800"
  },
  description: {
    color: tokens.colors.muted,
    fontSize: tokens.textSizes.body,
    lineHeight: 24
  }
});
