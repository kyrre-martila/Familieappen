import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, Button } from "../../../../src/components";
import { ErrorState, LoadingState } from "../../../../src/components/States";
import { HuskListForm } from "../../../../src/features/husk/components/HuskListForm";
import { useCreateHuskList } from "../../../../src/features/husk/hooks/useHuskListMutations";
import {
  defaultHuskListForm,
  type HuskListForm as Form,
} from "../../../../src/features/husk/huskListForm";
import { useCalendarFamilyMembers } from "../../../../src/features/calendar/hooks/useCalendarFamilyMembers";
import { theme } from "../../../../src/theme/tokens";
export default function CreateHuskListScreen() {
  const mutation = useCreateHuskList();
  const members = useCalendarFamilyMembers();
  const [form, setForm] = useState<Form>(() => defaultHuskListForm());
  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    mutation.resetError();
    setForm((x) => ({ ...x, [k]: v }));
  };
  if (mutation.familiesLoading)
    return (
      <LoadingState
        title="Klargjør liste"
        description="Henter familien før listen lagres."
      />
    );
  if (mutation.missingContext)
    return (
      <ErrorState
        title="Mangler familietilgang"
        description="Vi finner ikke en aktiv familie."
        onRetry={() => router.replace("/(app)/(tabs)/tasks")}
      />
    );
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Button
          title="Tilbake"
          variant="secondary"
          accessibilityLabel="Tilbake til Husk"
          accessibilityHint="Går tilbake til listeoversikten."
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(app)/(tabs)/tasks")
          }
        />
        <AppText variant="label">Lister</AppText>
      </View>
      <HuskListForm
        title="Ny liste"
        description="Opprett en Husk-liste for familien."
        form={form}
        onChange={update}
        onSubmit={() => mutation.create(form)}
        onCancel={() =>
          router.canGoBack()
            ? router.back()
            : router.replace("/(app)/(tabs)/tasks")
        }
        submitting={mutation.saving}
        error={mutation.error}
        familyMembers={members.familyMembers}
        submitTitle="Opprett liste"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  top: {
    padding: theme.spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
