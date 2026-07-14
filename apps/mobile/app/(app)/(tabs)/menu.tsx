import { PlaceholderScreen } from "../../../src/components/PlaceholderScreen";
import { Button } from "../../../src/components";
import { useAuth } from "../../../src/features/auth/AuthProvider";

export default function MenuScreen() {
  const { logout, isLoading } = useAuth();
  return <PlaceholderScreen title="Meny" description="Innstillinger, familie og hjelp samles her i en senere run." inTab><Button accessibilityLabel="Logg ut" disabled={isLoading} onPress={() => void logout()} title={isLoading ? "Logger ut…" : "Logg ut"} variant="secondary" /></PlaceholderScreen>;
}
