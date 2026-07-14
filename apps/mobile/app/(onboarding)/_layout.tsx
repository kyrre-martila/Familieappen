import { Redirect, Stack, usePathname } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getOnboardingRedirect } from "../../src/features/auth/routes";
import BootstrapScreen from "../splash";

export default function OnboardingLayout() {
  const { isRestoring, authDestination } = useAuth();
  const pathname = usePathname();
  if (isRestoring) return <BootstrapScreen />;
  const redirect = getOnboardingRedirect(pathname, authDestination);
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
