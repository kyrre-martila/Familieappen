import { AppText } from "./AppText";
import { Card } from "./Card";
import { EmptyState } from "./States";
import { Screen } from "./Screen";
import { appConfig } from "../config/env";
import { theme } from "../theme/tokens";

export function PlaceholderScreen({ title, description, children, inTab = false, topInset = "safe" }: { title: string; description: string; children?: React.ReactNode; inTab?: boolean; topInset?: "safe" | "none" }) {
  return <Screen bottomInset={inTab ? "tab" : "screen"} topInset={topInset}><AppText variant="label">FamilieAppen</AppText><AppText variant="title">{title}</AppText><AppText variant="lead" style={{ color: theme.colors.textMuted }}>{description}</AppText>{children}<EmptyState title="Ikke koblet til ennå" description="Denne skjermen er et trygt teknisk fundament uten faglogikk, innlogging eller mock-data." />{__DEV__ ? <Card><AppText variant="small" style={{ color: theme.colors.textMuted }}>API-base: {appConfig.apiUrl}</AppText></Card> : null}</Screen>;
}
