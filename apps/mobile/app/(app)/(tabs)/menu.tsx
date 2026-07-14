import { PlaceholderScreen } from "../../../src/components/PlaceholderScreen";
import { Button } from "../../../src/components";
import { useAuth } from "../../../src/features/auth/AuthProvider";

export default function MenuScreen() {
  const { logout, isLoggingOut } = useAuth();
  return <PlaceholderScreen title="Meny" description="Innstillinger, familie og hjelp samles her i en senere run." inTab><Button accessibilityLabel="Logg ut" disabled={isLoggingOut} onPress={() => void logout()} title={isLoggingOut ? "Logger ut…" : "Logg ut"} variant="secondary" /></PlaceholderScreen>;
}
