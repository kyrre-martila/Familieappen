import { useLocalSearchParams } from "expo-router";
import { AppText, Card } from "../../src/components";
import { PlaceholderScreen } from "../../src/components/PlaceholderScreen";
import { theme } from "../../src/theme/tokens";

export default function InvitationDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <PlaceholderScreen title="Du er invitert" description="Invitasjonsruten er bevart for fremtidige Universal Links og App Links."><Card><AppText variant="label">Invitasjonstoken</AppText><AppText style={{ color: theme.colors.textMuted }}>{token ?? "Mangler token"}</AppText></Card></PlaceholderScreen>;
}
