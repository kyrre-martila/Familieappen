import { StyleSheet, View } from "react-native";
import type { ReminderViewModel } from "../models";
import { ReminderCard } from "./ReminderCard";
export function ReminderList({ reminders, action, onAction, actionBusy }: { reminders: ReminderViewModel[]; action: "complete" | "undo"; onAction: (id: string) => void; actionBusy?: string | null }) { return <View style={styles.list} accessibilityLabel={action === "complete" ? "Aktive påminnelser" : "Historikk"}>{reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} action={action} actionBusy={actionBusy === reminder.id} onAction={() => onAction(reminder.id)} />)}</View>; }
const styles = StyleSheet.create({ list: { gap: 12 } });
