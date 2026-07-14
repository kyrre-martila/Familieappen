import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  AuthScreenShell,
  OnboardingHero,
  PrimaryButton,
  StatusCard,
  TextButton,
} from "../../src/components";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { appAssets } from "../../src/theme/assets";
import { theme } from "../../src/theme/tokens";
export default function PendingApprovalScreen() {
  const { logout, isLoggingOut } = useAuth();
  return (
    <AuthScreenShell
      title="Forespørsel sendt til familien"
      lead="Du venter på godkjenning for å bli med i familien."
    >
      <View style={styles.stack}>
        <OnboardingHero source={appAssets.familyFound} label="" />
        <StatusCard>
          <Ionicons
            name="hourglass-outline"
            size={44}
            color={theme.colors.primaryStrong}
          />
          <AppText variant="heading" style={styles.center}>
            Forespørsel sendt til familien
          </AppText>
          <AppText style={styles.center}>
            Du venter på godkjenning for å bli med i familien.
          </AppText>
          <AppText style={[styles.center, styles.muted]}>
            Når du blir godkjent får du tilgang til handlelister, kalender og
            oppgaver.
          </AppText>
        </StatusCard>
        <PrimaryButton
          title="Sjekk status på nytt"
          onPress={() => {}}
          disabled
        />
        <TextButton
          title={isLoggingOut ? "Logger ut…" : "Logg ut"}
          disabled={isLoggingOut}
          onPress={logout}
        />
      </View>
    </AuthScreenShell>
  );
}
const styles = StyleSheet.create({
  stack: { width: "100%", maxWidth: 540, gap: theme.spacing.md },
  center: { textAlign: "center" },
  muted: { color: theme.colors.textMuted },
});
