import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { status, isAuthenticated } = useAuth();
  if (status === "unknown" || status === "loading") return null;
  if (isAuthenticated) return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
