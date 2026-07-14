import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type ImageSourcePropType, type StyleProp, type TextInputProps, type ViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { BrandLogo, BackgroundDecoration } from "./Brand";
import { Card } from "./Card";
import { theme } from "../theme/tokens";

type FieldIcon = ReactNode;

export function AuthScreenShell({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.root}>
      <BackgroundDecoration />
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + theme.spacing.md, theme.spacing.xl),
            paddingBottom: Math.max(insets.bottom + theme.spacing.lg, theme.spacing.xxl)
          }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <BrandLogo style={styles.logo} />
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

export function AuthFormStack({ children, style, ...props }: ViewProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View {...props} style={[styles.formStack, style]}>{children}</View>;
}

export function FormField({ label, error, inputProps, leadingIcon, trailingIcon }: { label: string; error?: string; inputProps: TextInputProps; leadingIcon?: FieldIcon; trailingIcon?: FieldIcon }) {
  return (
    <View style={styles.field}>
      <AppText variant="label" style={styles.fieldLabel}>{label}</AppText>
      <View style={[styles.inputShell, error && styles.inputError]}>
        {leadingIcon ? <View pointerEvents="none" style={styles.leadingIcon}>{leadingIcon}</View> : null}
        <TextInput {...inputProps} placeholderTextColor={theme.colors.placeholder} style={[styles.input, inputProps.style]} />
        {trailingIcon ? <View style={styles.trailingIcon}>{trailingIcon}</View> : null}
      </View>
      {error ? <AppText accessibilityRole="alert" style={styles.fieldError}>{error}</AppText> : null}
    </View>
  );
}

export function PasswordField({ label, error, visible, onToggleVisible, inputProps, leadingIcon, trailingIcon, toggleLabel }: { label: string; error?: string; visible: boolean; onToggleVisible: () => void; inputProps: TextInputProps; leadingIcon?: FieldIcon; trailingIcon?: FieldIcon; toggleLabel?: string }) {
  const visibilityLabel = visible ? "Skjul passord" : "Vis passord";

  return (
    <FormField
      label={label}
      error={error}
      leadingIcon={leadingIcon}
      trailingIcon={trailingIcon ?? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toggleLabel ?? visibilityLabel}
          accessibilityState={{ selected: visible }}
          hitSlop={8}
          onPress={onToggleVisible}
          style={styles.iconButton}
        >
          <Ionicons aria-hidden name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={theme.colors.textMuted} />
        </Pressable>
      )}
      inputProps={{ ...inputProps, secureTextEntry: !visible, style: [styles.passwordInput, inputProps.style] }}
    />
  );
}

export function InlineMessage({ type, children }: { type: "error" | "success" | "info"; children: ReactNode }) { return <AppText accessibilityRole={type === "info" ? undefined : "alert"} style={[styles.message, styles[type]]}>{children}</AppText>; }
export function PrimaryButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="primary" />; }
export function SecondaryButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="secondary" />; }
export function TextButton(props: React.ComponentProps<typeof Button>) { return <Button {...props} variant="ghost" />; }
export function OnboardingHero({ source, label }: { source: ImageSourcePropType; label: string }) { return <Image accessibilityLabel={label} contentFit="contain" source={source} style={styles.hero} />; }
export function StatusCard({ children }: { children: ReactNode }) { return <Card style={styles.status}>{children}</Card>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.authBackground },
  content: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
  logo: { marginBottom: theme.spacing.sm },
  header: { gap: theme.spacing.sm, alignItems: "center" },
  title: { color: theme.colors.heading, textAlign: "center", letterSpacing: -1.2 },
  lead: { color: theme.colors.textMuted, textAlign: "center", maxWidth: 520, fontWeight: "500" },
  formStack: { width: "100%", maxWidth: 540, gap: theme.spacing.md },
  field: { gap: theme.spacing.sm, width: "100%" },
  fieldLabel: { color: theme.colors.heading, fontWeight: "800" },
  inputShell: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, paddingHorizontal: theme.spacing.md },
  leadingIcon: { width: 24, minHeight: 44, alignItems: "center", justifyContent: "center" },
  trailingIcon: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 52, flex: 1, color: theme.colors.text, fontSize: theme.typography.body, fontWeight: "500", paddingVertical: 0 },
  passwordInput: { paddingRight: theme.spacing.xs },
  iconButton: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center", borderRadius: theme.radius.pill },
  inputError: { borderColor: theme.colors.error },
  fieldError: { color: theme.colors.error, lineHeight: 19 },
  message: { borderRadius: theme.radius.md, padding: theme.spacing.md, overflow: "hidden", lineHeight: 22 },
  error: { backgroundColor: theme.colors.errorSoft, color: theme.colors.error },
  success: { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  info: { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
  hero: { width: "100%", maxWidth: 330, height: 220 },
  status: { width: "100%", maxWidth: 520, alignItems: "center" }
});
