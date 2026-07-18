import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import type { HuskView } from "../hooks/useHusk";

export function HuskViewSwitcher({ view, onChange }: { view: HuskView; onChange: (view: HuskView) => void }) {
  return <View style={styles.control} accessibilityRole="tablist" accessibilityLabel="Velg Husk-visning">
    <Option selected={view === "reminders"} title="Påminnelser" onPress={() => onChange("reminders")} />
    <Option selected={view === "lists"} title="Lister" onPress={() => onChange("lists")} />
  </View>;
}
function Option({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={`Vis ${title.toLowerCase()}`} onPress={onPress} style={[styles.option, selected && styles.selected]}><AppText style={[styles.text, selected && styles.selectedText]}>{title}</AppText></Pressable>;
}
const styles = StyleSheet.create({ control: { flexDirection: "row", padding: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }, option: { flex: 1, minHeight: 40, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center" }, selected: { backgroundColor: theme.colors.primaryStrong }, text: { color: theme.colors.primaryStrong, fontWeight: "800" }, selectedText: { color: theme.colors.surface } });
