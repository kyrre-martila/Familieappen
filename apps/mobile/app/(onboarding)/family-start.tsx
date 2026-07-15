import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  AuthScreenShell,
  Card,
  TextButton,
} from "../../src/components";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { theme } from "../../src/theme/tokens";
const choices = [
  {
    title: "Opprett ny familie",
    description: "Start en ny familie og inviter medlemmer senere.",
    cta: "Opprett familie",
    icon: "home-outline" as const,
    route: "/(onboarding)/create-family" as const,
  },
  {
    title: "Jeg har familiekode",
    description: "Bli med i en familie ved å skrive inn kode.",
    cta: "Bruk familiekode",
    icon: "mail-open-outline" as const,
    route: "/(onboarding)/join-family" as const,
  },
];
export default function FamilyStartScreen() {
  const { logout, isLoggingOut } = useAuth();
  return (
    <AuthScreenShell
      title="Hvordan vil du komme i gang?"
      lead="Opprett en ny familie eller bli med i en eksisterende."
    >
      <View
        accessibilityLabel="Velg hvordan du vil starte"
        style={styles.stack}
      >
        {choices.map((c) => (
          <Pressable
            key={c.route}
            accessibilityRole="button"
            accessibilityLabel={c.cta}
            accessibilityHint={c.description}
            onPress={() => router.push(c.route)}
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Ionicons
                name={c.icon}
                size={34}
                color={theme.colors.primaryStrong}
              />
            </View>
            <View style={styles.copy}>
              <AppText variant="heading" style={styles.choiceTitle}>
                {c.title}
              </AppText>
              <AppText style={styles.desc}>{c.description}</AppText>
              <AppText style={styles.cta}>{c.cta}</AppText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ))}
        <Card style={styles.note}>
          <AppText style={styles.noteText}>
            Har du fått invitasjonslenke?
          </AppText>
          <AppText style={styles.noteText}>
            Åpne linken du fikk tilsendt.
          </AppText>
        </Card>
        <TextButton
          title={isLoggingOut ? "Logger ut…" : "Logg ut"}
          disabled={isLoggingOut}
          onPress={() => void logout()}
        />
      </View>
    </AuthScreenShell>
  );
}
const styles = StyleSheet.create({
  stack: { width: "100%", maxWidth: 540, gap: theme.spacing.md },
  choice: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    padding: theme.spacing.md,
  },
  pressed: { opacity: 0.76 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 4 },
  choiceTitle: { color: theme.colors.heading },
  desc: { color: theme.colors.textMuted },
  cta: { color: theme.colors.primaryStrong, fontWeight: "900" },
  note: { alignItems: "center", padding: theme.spacing.md },
  noteText: { color: theme.colors.textMuted, textAlign: "center" },
});
