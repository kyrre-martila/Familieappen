import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { isRestoring, isAuthenticated, authDestination } = useAuth();
  if (isRestoring) return null;
  if (isAuthenticated) return <Redirect href={authDestination} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
