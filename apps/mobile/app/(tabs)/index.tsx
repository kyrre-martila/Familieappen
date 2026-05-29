import { Text } from "react-native";
import { ScreenShell } from "./screenShell";
import { sharingLevels } from "@familieappen/shared";
import { tokens } from "@familieappen/ui";

export default function HomeScreen() {
  return (
    <ScreenShell
      title="Home"
      description="A future daily overview for calendar items, dinner plans, shopping status, tasks and reminders."
    >
      <Text style={{ color: tokens.colors.muted }}>
        Sharing levels ready for future features: {sharingLevels.join(", ")}.
      </Text>
    </ScreenShell>
  );
}
