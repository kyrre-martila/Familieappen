import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import { AppText, Button } from "../../../components";
import { EmptyState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { groupHuskListItems, mapHuskListToViewModel } from "../models";
import {
  defaultHuskListItemForm,
  huskListItemToForm,
  validateHuskListItemForm,
  type HuskListItemForm,
} from "../huskListForm";
import { useHuskListItemMutations } from "../hooks/useHuskListMutations";
import type { HuskList, HuskListItem } from "@familieappen/shared";

type Props = { list: HuskList; onEditList?: () => void };
export function HuskListDetails({ list, onEditList }: Props) {
  const progress = mapHuskListToViewModel(list);
  const { active, completed } = groupHuskListItems(list);
  const mutations = useHuskListItemMutations(list.id);
  const [newForm, setNewForm] = useState(() => defaultHuskListItemForm());
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HuskListItemForm>(() =>
    defaultHuskListItemForm(),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const add = async () => {
    const errors = validateHuskListItemForm(newForm);
    if (errors.title) {
      setFormError(errors.title);
      return;
    }
    setFormError(null);
    await mutations.createItem(newForm);
    setNewForm(defaultHuskListItemForm());
  };
  const startEdit = (item: HuskListItem) => {
    setEditing(item.id);
    setEditForm(huskListItemToForm(item));
    setFormError(null);
  };
  const saveEdit = async () => {
    if (!editing) return;
    const errors = validateHuskListItemForm(editForm);
    if (errors.title) {
      setFormError(errors.title);
      return;
    }
    await mutations.updateItem({ itemId: editing, form: editForm });
    setEditing(null);
  };
  const confirmDelete = (item: HuskListItem) =>
    Alert.alert("Slett element", `Vil du slette ${item.title}?`, [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Slett",
        style: "destructive",
        onPress: () => void mutations.deleteItem(item.id),
      },
    ]);
  return (
    <View style={styles.content}>
      <View style={styles.progress}>
        <View style={styles.headingRow}>
          <AppText variant="heading">{list.title}</AppText>
          {onEditList ? (
            <Button
              title="Rediger liste"
              variant="secondary"
              accessibilityLabel={`Rediger listen ${list.title}`}
              accessibilityHint="Åpner skjema for å redigere listen."
              onPress={onEditList}
            />
          ) : null}
        </View>
        <AppText style={styles.muted}>{progress.progressLabel}</AppText>
        <View style={styles.track} accessibilityElementsHidden>
          <View
            style={[styles.fill, { width: `${progress.progressPercent}%` }]}
          />
        </View>
      </View>
      <View style={styles.addBox}>
        <AppText variant="label">Nytt element</AppText>
        <TextInput
          value={newForm.title}
          onChangeText={(title) => {
            mutations.resetError();
            setFormError(null);
            setNewForm((f) => ({ ...f, title }));
          }}
          editable={!mutations.saving}
          accessibilityLabel={`Legg til element i ${list.title}`}
          accessibilityHint="Skriv teksten for et nytt listeelement."
          placeholder="Legg til element"
          placeholderTextColor={theme.colors.placeholder}
          style={styles.input}
        />
        <Button
          title={mutations.saving ? "Lagrer …" : "Legg til"}
          disabled={mutations.saving}
          accessibilityLabel={`Legg til element i ${list.title}`}
          accessibilityHint="Lagrer et nytt element i listen."
          onPress={() => void add()}
        />
      </View>
      {formError ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {formError}
        </AppText>
      ) : mutations.error ? (
        <AppText accessibilityRole="alert" style={styles.error}>
          {mutations.error}
        </AppText>
      ) : null}
      {list.items.length === 0 ? (
        <EmptyState
          title="Denne listen er tom"
          description="Det er ingen elementer på listen ennå."
        />
      ) : (
        <>
          {active.length ? (
            <Section
              title="Aktive"
              items={active}
              editing={editing}
              form={editForm}
              setForm={setEditForm}
              saving={mutations.saving}
              onEdit={startEdit}
              onCancel={() => setEditing(null)}
              onSave={() => void saveEdit()}
              onDelete={confirmDelete}
            />
          ) : completed.length ? (
            <EmptyState
              title="Alt på listen er fullført"
              description="Alle elementene er fullført."
            />
          ) : null}
          {completed.length ? (
            <Section
              title="Fullført"
              items={completed}
              completed
              editing={editing}
              form={editForm}
              setForm={setEditForm}
              saving={mutations.saving}
              onEdit={startEdit}
              onCancel={() => setEditing(null)}
              onSave={() => void saveEdit()}
              onDelete={confirmDelete}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
function Section({
  title,
  items,
  completed = false,
  editing,
  form,
  setForm,
  saving,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  title: string;
  items: ReturnType<typeof groupHuskListItems>["active"];
  completed?: boolean;
  editing: string | null;
  form: HuskListItemForm;
  setForm: (f: HuskListItemForm) => void;
  saving: boolean;
  onEdit: (i: HuskListItem) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: (i: HuskListItem) => void;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          {editing === item.id ? (
            <>
              <TextInput
                value={form.title}
                onChangeText={(title) => setForm({ ...form, title })}
                editable={!saving}
                accessibilityLabel={`Rediger ${item.title}`}
                accessibilityHint="Endre teksten på listeelementet."
                style={styles.input}
              />
              <TextInput
                value={form.description}
                onChangeText={(description) =>
                  setForm({ ...form, description })
                }
                editable={!saving}
                multiline
                accessibilityLabel="Beskrivelse"
                accessibilityHint="Valgfri beskrivelse."
                style={[styles.input, styles.note]}
              />
              <View style={styles.row}>
                <Button
                  title="Lagre"
                  disabled={saving}
                  accessibilityLabel={`Lagre ${item.title}`}
                  accessibilityHint="Lagrer endringen."
                  onPress={onSave}
                />
                <Button
                  title="Avbryt"
                  variant="ghost"
                  disabled={saving}
                  onPress={onCancel}
                />
              </View>
            </>
          ) : (
            <>
              <AppText
                style={[styles.itemTitle, completed && styles.completed]}
              >
                {item.title}
              </AppText>
              {item.description ? (
                <AppText style={[styles.muted, completed && styles.completed]}>
                  {item.description}
                </AppText>
              ) : null}
              <View style={styles.row}>
                <Button
                  title="Rediger"
                  variant="secondary"
                  accessibilityLabel={`Rediger ${item.title}`}
                  accessibilityHint="Åpner redigering for listeelementet."
                  onPress={() => onEdit(item as HuskListItem)}
                />
                <Button
                  title="Slett"
                  variant="ghost"
                  accessibilityLabel={`Slett ${item.title}`}
                  accessibilityHint="Ber om bekreftelse før elementet slettes."
                  onPress={() => onDelete(item as HuskListItem)}
                />
              </View>
            </>
          )}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg },
  progress: { gap: theme.spacing.sm },
  headingRow: { gap: theme.spacing.sm },
  muted: { color: theme.colors.textMuted },
  track: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: theme.colors.primarySoft,
  },
  fill: { height: "100%", backgroundColor: theme.colors.primary },
  section: { gap: theme.spacing.sm },
  item: {
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemTitle: { fontWeight: "700" },
  completed: {
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },
  addBox: { gap: theme.spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  note: { minHeight: 72, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: theme.spacing.sm, flexWrap: "wrap" },
  error: { color: theme.colors.error },
});
