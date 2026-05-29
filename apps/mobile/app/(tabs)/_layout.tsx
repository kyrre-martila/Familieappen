import { Tabs } from "expo-router";
import { Text } from "react-native";
import { tokens } from "@familieappen/ui";

const tabIcons: Record<string, string> = {
  index: "🏠",
  calendar: "📅",
  meals: "🍽️",
  shopping: "🛒",
  tasks: "✅",
  wishlists: "🎁",
  settings: "⚙️"
};

function TabIcon({ routeName, color }: { routeName: string; color: string }) {
  return <Text style={{ color, fontSize: tokens.textSizes.body }}>{tabIcons[routeName]}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: tokens.colors.background },
        headerTitleStyle: { color: tokens.colors.text, fontWeight: "700" },
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.muted,
        tabBarStyle: {
          backgroundColor: tokens.colors.surface,
          borderTopColor: tokens.colors.border
        },
        tabBarIcon: ({ color }) => <TabIcon routeName={route.name} color={color} />
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
      <Tabs.Screen name="meals" options={{ title: "Meals" }} />
      <Tabs.Screen name="shopping" options={{ title: "Shopping" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="wishlists" options={{ title: "Wishlists" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
