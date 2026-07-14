import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import BootstrapScreen from "../splash";

export default function AppLayout() {
  const { isRestoring, isAuthenticated } = useAuth();
  if (isRestoring) return <BootstrapScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
