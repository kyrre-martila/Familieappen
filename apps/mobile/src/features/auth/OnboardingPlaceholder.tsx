import { StyleSheet } from "react-native";
import { AppText, AuthScreenShell, OnboardingHero, SecondaryButton, StatusCard } from "../../components";
import { appAssets } from "../../theme/assets";
import { theme } from "../../theme/tokens";
import { useAuth } from "./AuthProvider";

type Variant = "family-start" | "pending-approval" | "blocked";
const copy = {
  "family-start": { title: "Finn eller opprett familie", description: "Kontoen din er klar. Neste steg er å koble deg til familien din.", image: appAssets.familyHero, label: "Familieillustrasjon" },
  "pending-approval": { title: "Venter på godkjenning", description: "Forespørselen er sendt. Du får tilgang så snart en administrator godkjenner deg.", image: appAssets.familyFound, label: "Familie funnet" },
  blocked: { title: "Tilgang må avklares", description: "Vi kan ikke åpne familieområdet før kontostatusen er avklart.", image: appAssets.familyInvite, label: "Invitasjonsillustrasjon" }
} as const;
export function OnboardingPlaceholder({ variant = "family-start", title, description }: { variant?: Variant; title?: string; description?: string }) { const { logout, isLoggingOut } = useAuth(); const content = copy[variant]; return <AuthScreenShell title={title ?? content.title} lead={description ?? content.description}><OnboardingHero source={content.image} label={content.label} /><StatusCard><AppText variant="heading" style={styles.center}>{title ?? content.title}</AppText><AppText style={styles.text}>{description ?? content.description}</AppText><SecondaryButton accessibilityLabel="Logg ut" disabled={isLoggingOut} onPress={() => void logout()} title={isLoggingOut ? "Logger ut…" : "Logg ut"} /></StatusCard></AuthScreenShell>; }
const styles = StyleSheet.create({ center: { textAlign: "center", color: theme.colors.heading }, text: { color: theme.colors.textMuted, textAlign: "center" } });
