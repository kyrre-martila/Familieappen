import { Button, PlaceholderScreen } from "../../components";
import { useAuth } from "./AuthProvider";

export function OnboardingPlaceholder({ title, description }: { title: string; description: string }) {
  const { logout, isLoggingOut } = useAuth();
  return (
    <PlaceholderScreen title={title} description={description}>
      <Button accessibilityLabel="Logg ut" disabled={isLoggingOut} onPress={() => void logout()} title={isLoggingOut ? "Logger ut…" : "Logg ut"} variant="secondary" />
    </PlaceholderScreen>
  );
}
