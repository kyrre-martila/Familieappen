import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AuthScreenShell, InlineMessage, OnboardingHero, PrimaryButton, StatusCard, TextButton } from "../../src/components";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { ApiError } from "../../src/lib/api/client";
import { appAssets } from "../../src/theme/assets";
import { theme } from "../../src/theme/tokens";

export default function PendingApprovalScreen() {
  const { logout, isLoggingOut, refreshFamilyStatus, familyStatus } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const checkStatus = useCallback(async (kind: "manual" | "auto" = "manual") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setError(null);
    try {
      await refreshFamilyStatus();
      setMessage(kind === "manual" ? "Status er sjekket. Forespørselen venter fortsatt på godkjenning." : null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kunne ikke sjekke status akkurat nå. Prøv igjen.");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [refreshFamilyStatus]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => { if (state === "active") void checkStatus("auto"); });
    const interval = setInterval(() => void checkStatus("auto"), 120000);
    return () => { sub.remove(); clearInterval(interval); };
  }, [checkStatus]);

  return <AuthScreenShell title="Forespørsel sendt til familien" lead="Du venter på godkjenning for å bli med i familien.">
    <View style={styles.stack}>
      <OnboardingHero source={appAssets.familyFound} label="" />
      <StatusCard>
        <Ionicons name={familyStatus === "pending" ? "hourglass-outline" : "refresh-outline"} size={44} color={theme.colors.primaryStrong} />
        <AppText variant="heading" style={styles.center}>Forespørsel sendt til familien</AppText>
        <AppText style={styles.center}>Du venter på godkjenning for å bli med i familien.</AppText>
        <AppText style={[styles.center, styles.muted]}>Når du blir godkjent, sender appen deg automatisk videre etter neste statussjekk.</AppText>
      </StatusCard>
      {message ? <InlineMessage type="success">{message}</InlineMessage> : null}
      {error ? <InlineMessage type="error">{error}</InlineMessage> : null}
      <PrimaryButton title={refreshing ? "Sjekker…" : "Sjekk status"} onPress={() => void checkStatus("manual")} disabled={refreshing} />
      <TextButton title={isLoggingOut ? "Logger ut…" : "Logg ut"} disabled={isLoggingOut || refreshing} onPress={logout} />
    </View>
  </AuthScreenShell>;
}
const styles = StyleSheet.create({ stack: { width: "100%", maxWidth: 540, gap: theme.spacing.md }, center: { textAlign: "center" }, muted: { color: theme.colors.textMuted } });
