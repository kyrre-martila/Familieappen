import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { FamilyMember } from "@familieappen/shared";
import { AppText, Button, Card, Screen } from "../../../components";
import { theme } from "../../../theme/tokens";
import {
  validateHuskListForm,
  type HuskListForm as Form,
} from "../huskListForm";

type Props = {
  title: string;
  description: string;
  form: Form;
  onChange: <K extends keyof Form>(key: K, value: Form[K]) => void;
  onSubmit: () => Promise<unknown>;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  familyMembers: FamilyMember[];
  submitTitle: string;
};
const icons = ["home", "summer", "birthday", "celebration"];
export function HuskListForm({
  title,
  description,
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  error,
  familyMembers,
  submitTitle,
}: Props) {
  const [errors, setErrors] = useState<ReturnType<typeof validateHuskListForm>>(
    {},
  );
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const isSubmitting = submitting || localSubmitting;
  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setErrors((e) => ({ ...e, [key]: undefined }));
    onChange(key, value);
  };
  const submit = async () => {
    if (isSubmitting) return;
    const next = validateHuskListForm(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    setLocalSubmitting(true);
    try {
      await onSubmit();
    } catch {
    } finally {
      setLocalSubmitting(false);
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.root}
    >
      <Screen bottomInset="screen">
        <Card style={styles.card}>
          <AppText variant="title">{title}</AppText>
          <AppText style={styles.muted}>{description}</AppText>
          <Field label="Listenavn" error={errors.title}>
            <TextInput
              value={form.title}
              onChangeText={(v) => update("title", v)}
              editable={!isSubmitting}
              accessibilityLabel="Listenavn"
              accessibilityHint="Skriv navnet på listen."
              placeholder="For eksempel Pakkeliste"
              placeholderTextColor={theme.colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="Beskrivelse">
            <TextInput
              value={form.description}
              onChangeText={(v) => update("description", v)}
              editable={!isSubmitting}
              multiline
              accessibilityLabel="Beskrivelse"
              accessibilityHint="Valgfri beskrivelse for listen."
              placeholder="Valgfri beskrivelse"
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.input, styles.note]}
            />
          </Field>
          <Field label="Ikon">
            <ScrollView horizontal contentContainerStyle={styles.options}>
              {icons.map((icon) => (
                <Pick
                  key={icon}
                  label={icon}
                  selected={form.icon === icon}
                  disabled={isSubmitting}
                  onPress={() => update("icon", icon)}
                />
              ))}
            </ScrollView>
          </Field>
          <Field label="Synlighet" error={errors.memberIds}>
            <View style={styles.options}>
              <Pick
                label="Hele familien"
                selected={form.scope === "family"}
                disabled={isSubmitting}
                onPress={() => {
                  update("scope", "family");
                  update("memberIds", []);
                }}
              />
              {familyMembers.map((m) => (
                <Pick
                  key={m.id}
                  label={m.displayName}
                  selected={form.memberIds.includes(m.id)}
                  disabled={isSubmitting}
                  onPress={() => {
                    const ids = form.memberIds.includes(m.id)
                      ? form.memberIds.filter((id) => id !== m.id)
                      : [...form.memberIds, m.id];
                    update("memberIds", ids);
                    update("scope", "members");
                  }}
                />
              ))}
            </View>
          </Field>
          {error ? (
            <AppText accessibilityRole="alert" style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <Button
            title={isSubmitting ? "Lagrer …" : submitTitle}
            disabled={isSubmitting}
            accessibilityLabel={submitTitle}
            accessibilityHint="Lagrer listen."
            onPress={() => void submit()}
          />
          <Button
            title="Avbryt"
            variant="ghost"
            disabled={isSubmitting}
            accessibilityLabel="Avbryt"
            accessibilityHint="Går tilbake uten å lagre."
            onPress={onCancel}
          />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {children}
      {error ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
function Pick({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      title={label}
      variant={selected ? "primary" : "secondary"}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityHint="Velger dette alternativet."
      onPress={onPress}
    />
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { gap: theme.spacing.md },
  muted: { color: theme.colors.textMuted },
  field: { gap: theme.spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  note: { minHeight: 88, textAlignVertical: "top" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  error: { color: theme.colors.error },
});
