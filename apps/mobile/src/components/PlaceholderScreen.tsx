import { AppText, Card, EmptyState, Screen } from ".";
import { appConfig } from "../config/env";
import { theme } from "../theme/tokens";

export function PlaceholderScreen({ title, description, children, inTab = false }: { title: string; description: string; children?: React.ReactNode; inTab?: boolean }) {
  return <Screen bottomInset={inTab ? "tab" : "screen"}><AppText variant="label">FamilieAppen</AppText><AppText variant="title">{title}</AppText><AppText variant="lead" style={{ color: theme.colors.textMuted }}>{description}</AppText>{children}<EmptyState title="Ikke koblet til ennå" description="Denne skjermen er et trygt teknisk fundament uten faglogikk, innlogging eller mock-data." />{__DEV__ ? <Card><AppText variant="small" style={{ color: theme.colors.textMuted }}>API-base: {appConfig.apiUrl}</AppText></Card> : null}</Screen>;
}
