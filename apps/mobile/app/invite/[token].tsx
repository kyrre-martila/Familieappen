import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { tokens } from "@familieappen/ui";
import { ScreenShell } from "../(tabs)/screenShell";

export default function InvitationDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  return (
    <ScreenShell
      title="Du er invitert!"
      description="Denne ruten gjør at native appen kan åpne samme invitasjonstoken som webflyten når Universal Links og App Links aktiveres."
    >
      <Text style={{ color: tokens.colors.muted }}>
        Invitasjon: {token ?? "mangler token"}
      </Text>
    </ScreenShell>
  );
}
