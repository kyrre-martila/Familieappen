import { StyleSheet, View } from "react-native";
import type { ReminderViewModel } from "../models";
import { ReminderCard } from "./ReminderCard";
export function ReminderList({ reminders }: { reminders: ReminderViewModel[] }) { return <View style={styles.list} accessibilityLabel="Aktive påminnelser">{reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)}</View>; }
const styles = StyleSheet.create({ list: { gap: 12 } });
