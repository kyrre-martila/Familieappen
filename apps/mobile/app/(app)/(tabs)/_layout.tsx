import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View, type GestureResponderEvent } from "react-native";
import { CreateActionSheet } from "../../../src/features/create/CreateActionSheet";
import { theme } from "../../../src/theme/tokens";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const icons: Record<string, IconName> = { index: "home-outline", calendar: "calendar-outline", tasks: "checkbox-outline", menu: "menu-outline" };

export default function TabLayout() {
  const [createVisible, setCreateVisible] = useState(false);
  return <><Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted, tabBarLabelStyle: styles.label, tabBarStyle: styles.bar, tabBarIcon: ({ color, size }) => route.name === "create" ? <View style={styles.createButton}><Ionicons name="add" color={theme.colors.surface} size={34} /></View> : <Ionicons name={icons[route.name] ?? "ellipse-outline"} color={color} size={size} /> })}><Tabs.Screen name="index" options={{ title: "Hjem" }} /><Tabs.Screen name="calendar" options={{ title: "Kalender" }} /><Tabs.Screen name="create" options={{ title: "Opprett", tabBarButton: ({ ref: _ref, onPress: _onPress, style, ...props }) => <Pressable {...props} accessibilityRole="button" accessibilityLabel="Opprett" style={[style, styles.createTab]} onPress={(event: GestureResponderEvent) => { event.preventDefault(); setCreateVisible(true); }} /> }} /><Tabs.Screen name="tasks" options={{ title: "Husk" }} /><Tabs.Screen name="menu" options={{ title: "Meny" }} /></Tabs><CreateActionSheet visible={createVisible} onClose={() => setCreateVisible(false)} /></>;
}
const styles = StyleSheet.create({ bar: { minHeight: 76, paddingTop: 8, paddingBottom: 12, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }, label: { fontSize: 12, fontWeight: "700" }, createTab: { top: -18, minHeight: 64, minWidth: 64, alignItems: "center", justifyContent: "center" }, createButton: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary, ...theme.shadow.floating } });
