import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import BootstrapScreen from "../splash";

export default function OnboardingLayout() {
  const { isRestoring, isAuthenticated, authDestination } = useAuth();
  if (isRestoring) return <BootstrapScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (authDestination === "/(app)/(tabs)") return <Redirect href={authDestination} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
