import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, Button } from "../../../../../src/components";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../../src/components/States";
import { HuskListForm } from "../../../../../src/features/husk/components/HuskListForm";
import { useHuskListDetails } from "../../../../../src/features/husk/hooks/useHuskListDetails";
import { useUpdateHuskList } from "../../../../../src/features/husk/hooks/useHuskListMutations";
import {
  defaultHuskListForm,
  huskListToForm,
  type HuskListForm as Form,
} from "../../../../../src/features/husk/huskListForm";
import { useCalendarFamilyMembers } from "../../../../../src/features/calendar/hooks/useCalendarFamilyMembers";
import { theme } from "../../../../../src/theme/tokens";
export default function EditHuskListScreen() {
  const { listId: raw } = useLocalSearchParams<{ listId?: string }>();
  const listId = typeof raw === "string" && raw.trim() ? raw : null;
  const details = useHuskListDetails(listId);
  const mutation = useUpdateHuskList(listId ?? "");
  const members = useCalendarFamilyMembers();
  const [form, setForm] = useState<Form>(() => defaultHuskListForm());
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (details.list && !hydrated && !dirty) {
      setForm(huskListToForm(details.list));
      setHydrated(true);
    }
  }, [details.list, hydrated, dirty]);
  const update = <K extends keyof Form>(k: K, v: Form[K]) => {
    mutation.resetError();
    setDirty(true);
    setForm((x) => ({ ...x, [k]: v }));
  };
  if (!listId)
    return (
      <EmptyState
        title="Listen finnes ikke"
        description="Vi kunne ikke finne listen du ba om."
      />
    );
  if (details.loading)
    return <LoadingState title="Laster liste" description="Henter listen." />;
  if (details.error)
    return (
      <ErrorState
        description="Kunne ikke hente listen akkurat nå."
        onRetry={() => void details.refetch()}
      />
    );
  if (details.missingContext)
    return (
      <ErrorState
        title="Mangler familietilgang"
        description="Vi finner ikke en aktiv familie."
        onRetry={() => router.replace("/(app)/(tabs)/tasks")}
      />
    );
  if (!details.list || details.list.archived)
    return (
      <EmptyState
        title="Listen finnes ikke"
        description="Den kan være slettet eller arkivert."
      />
    );
  if (!hydrated)
    return (
      <LoadingState title="Klargjør skjema" description="Fyller ut listen." />
    );
  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Button
          title="Tilbake"
          variant="secondary"
          accessibilityLabel="Tilbake til listen"
          accessibilityHint="Går tilbake til listedetaljene."
          onPress={() => router.replace(`/(app)/husk/lists/${listId}`)}
        />
        <AppText variant="label">Lister</AppText>
      </View>
      <HuskListForm
        title="Rediger liste"
        description="Oppdater listenavn og synlighet."
        form={form}
        onChange={update}
        onSubmit={() => mutation.update(form)}
        onCancel={() => router.replace(`/(app)/husk/lists/${listId}`)}
        submitting={mutation.saving}
        error={mutation.error}
        familyMembers={members.familyMembers}
        submitTitle="Lagre liste"
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
