import { router, useLocalSearchParams } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import { Screen } from "../../../../src/components/Screen";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../src/components/States";
import { HuskListDetails } from "../../../../src/features/husk/components/HuskListDetails";
import { useHuskListDetails } from "../../../../src/features/husk/hooks/useHuskListDetails";
import { theme } from "../../../../src/theme/tokens";
import { getHuskListBackAction } from "../../../../src/features/husk/navigation";

export function goBackToHuskListOverview(canGoBack = router.canGoBack()) {
  if (getHuskListBackAction(canGoBack) === "back") {
    router.back();
    return "back";
  }
  router.replace("/(app)/(tabs)/tasks");
  return "husk";
}

export default function HuskListDetailScreen() {
  const { listId: rawListId } = useLocalSearchParams<{ listId?: string }>();
  const listId =
    typeof rawListId === "string" && rawListId.trim() ? rawListId : null;
  const details = useHuskListDetails(listId);
  return (
    <Screen
      bottomInset="screen"
      refreshControl={
        <RefreshControl
          refreshing={details.refreshing}
          onRefresh={() => void details.refetch()}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.topbar}>
        <Button
          title="Tilbake"
          variant="secondary"
          onPress={() => goBackToHuskListOverview()}
        />
        <AppText variant="label">Lister</AppText>
      </View>
      {!listId ? (
        <EmptyState
          title="Listen finnes ikke"
          description="Vi kunne ikke finne listen du ba om."
        />
      ) : details.loading ? (
        <LoadingState title="Laster liste" description="Henter listen." />
      ) : details.error ? (
        <ErrorState
          description="Kunne ikke hente listen akkurat nå."
          onRetry={() => void details.refetch()}
        />
      ) : details.missingContext ? (
        <ErrorState
          title="Mangler familietilgang"
          description="Vi finner ikke en aktiv familie for Husk akkurat nå."
          onRetry={() => void details.refetch()}
        />
      ) : !details.list || details.list.archived ? (
        <EmptyState
          title="Listen finnes ikke"
          description="Den kan være slettet eller arkivert siden Husk ble lastet."
        />
      ) : (
        <HuskListDetails
          list={details.list}
          onEditList={() =>
            router.push(`/(app)/husk/lists/${details.list!.id}/edit`)
          }
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
});
