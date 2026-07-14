import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { isRestoring, isAuthenticated } = useAuth();
  if (isRestoring) return null;
  if (isAuthenticated) return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
