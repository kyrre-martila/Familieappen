import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "../src/providers/AppProviders";
import { ErrorBoundary } from "../src/providers/ErrorBoundary";
import { theme } from "../src/theme/tokens";
import "../src/config/env";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => undefined); }, [ready]);
  if (!ready) return null;
  return <ErrorBoundary><AppProviders><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}><Stack.Screen name="splash" /><Stack.Screen name="(auth)" /><Stack.Screen name="(app)" /><Stack.Screen name="invite/[token]" /></Stack><StatusBar style="dark" backgroundColor={theme.colors.background} /></AppProviders></ErrorBoundary>;
}
