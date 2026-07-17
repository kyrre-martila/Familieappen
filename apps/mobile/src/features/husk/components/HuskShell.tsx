import { RefreshControl, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import { EmptyState, ErrorState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { useHusk } from "../hooks/useHusk";
import { HuskListCard } from "./HuskListCard";
import { HuskSection } from "./HuskSection";
import { ReminderList } from "./ReminderList";
import { ReminderSkeleton } from "./ReminderSkeleton";
export function HuskShell() { const husk = useHusk(); return <Screen bottomInset="tab" refreshControl={<RefreshControl refreshing={husk.refreshing} onRefresh={() => void husk.refresh()} tintColor={theme.colors.primary} />}><View style={styles.header}><AppText variant="title">Husk</AppText><AppText style={styles.description}>Påminnelser og lister for familien.</AppText></View>{husk.loading ? <ReminderSkeleton /> : husk.error ? <ErrorState description="Kunne ikke hente Husk akkurat nå." onRetry={() => void husk.refresh()} /> : <><HuskSection title="Påminnelser">{husk.reminders.length ? <ReminderList reminders={husk.reminders} /> : <EmptyState title="Ingen påminnelser ennå" description="Nye påminnelser fra web dukker opp her." />}</HuskSection><HuskSection title="Lister">{husk.lists.length ? <View style={styles.list}>{husk.lists.map((list) => <HuskListCard key={list.id} list={list} />)}</View> : <EmptyState title="Ingen lister ennå" description="Nye lister fra web dukker opp her." />}</HuskSection></>}</Screen>; }
const styles = StyleSheet.create({ header: { gap: theme.spacing.xs }, description: { color: theme.colors.textMuted }, list: { gap: theme.spacing.md } });
