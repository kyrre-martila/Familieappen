import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ImageSourcePropType, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { BrandLogo, BackgroundDecoration } from "./Brand";
import { Card } from "./Card";
import { theme } from "../theme/tokens";

export function AuthScreenShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.root}>
      <BackgroundDecoration />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.xl, paddingBottom: insets.bottom + theme.spacing.xxl }]}>
        <BrandLogo />
        <View style={styles.header}>
          <AppText accessibilityRole="header" variant="title" style={styles.title}>{title}</AppText>
          <AppText variant="lead" style={styles.lead}>{lead}</AppText>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export const FormCard = Card;
export function FormField({ label, error, inputProps }: { label: string; error?: string; inputProps: TextInputProps }) {
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText><TextInput {...inputProps} placeholderTextColor={theme.colors.placeholder} style={[styles.input, inputProps.style, error && styles.inputError]} />{error ? <AppText accessibilityRole="alert" style={styles.fieldError}>{error}</AppText> : null}</View>;
}
export function PasswordField({ label, error, visible, onToggleVisible, inputProps }: { label: string; error?: string; visible: boolean; onToggleVisible: () => void; inputProps: TextInputProps }) {
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText><View style={[styles.passwordRow, error && styles.inputError]}><TextInput {...inputProps} placeholderTextColor={theme.colors.placeholder} secureTextEntry={!visible} style={[styles.passwordInput, inputProps.style]} /><Pressable accessibilityRole="button" accessibilityLabel={visible ? "Skjul passord" : "Vis passord"} hitSlop={10} onPress={onToggleVisible} style={styles.toggle}><AppText style={styles.toggleText}>{visible ? "Skjul" : "Vis"}</AppText></Pressable></View>{error ? <AppText accessibilityRole="alert" style={styles.fieldError}>{error}</AppText> : null}</View>;
}
export function InlineMessage({ type, children }: { type: "error" | "success" | "info"; children: ReactNode }) { return <AppText accessibilityRole={type === "info" ? undefined : "alert"} style={[styles.message, styles[type]]}>{children}</AppText>; }
export function PrimaryButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="primary" />; }
export function SecondaryButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="secondary" />; }
export function TextButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="ghost" />; }
export function OnboardingHero({ source, label }: { source: ImageSourcePropType; label: string }) { return <Image accessibilityLabel={label} contentFit="contain" source={source} style={styles.hero} />; }
export function StatusCard({ children }: { children: ReactNode }) { return <Card style={styles.status}>{children}</Card>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.authBackground }, content: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg }, header: { gap: theme.spacing.sm, alignItems: "center" }, title: { color: theme.colors.heading, textAlign: "center", letterSpacing: -1.2 }, lead: { color: theme.colors.textMuted, textAlign: "center", maxWidth: 520, fontWeight: "500" }, field: { gap: theme.spacing.sm }, fieldLabel: { color: theme.colors.heading }, input: { minHeight: 54, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, paddingHorizontal: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.body }, inputError: { borderColor: theme.colors.error }, passwordRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, paddingHorizontal: theme.spacing.md }, passwordInput: { flex: 1, color: theme.colors.text, fontSize: theme.typography.body }, toggle: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }, toggleText: { color: theme.colors.primaryStrong, fontWeight: "800" }, fieldError: { color: theme.colors.error }, message: { borderRadius: theme.radius.md, padding: theme.spacing.md, overflow: "hidden" }, error: { backgroundColor: theme.colors.errorSoft, color: theme.colors.error }, success: { backgroundColor: theme.colors.successSoft, color: theme.colors.success }, info: { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong }, hero: { width: "100%", maxWidth: 330, height: 220 }, status: { width: "100%", maxWidth: 520, alignItems: "center" } });
