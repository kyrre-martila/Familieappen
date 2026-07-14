import { ActivityIndicator } from "react-native";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";
import { theme } from "../theme/tokens";
export function LoadingState({ title = "Laster", description }: { title?: string; description: string }) { return <Card accessibilityRole="progressbar"><ActivityIndicator color={theme.colors.primary} /><AppText variant="heading">{title}</AppText><AppText>{description}</AppText></Card>; }
export function EmptyState({ title, description }: { title: string; description: string }) { return <Card><AppText variant="heading">{title}</AppText><AppText style={{ color: theme.colors.textMuted }}>{description}</AppText></Card>; }
export function ErrorState({ title = "Noe gikk galt", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) { return <Card><AppText variant="heading">{title}</AppText><AppText style={{ color: theme.colors.textMuted }}>{description}</AppText>{onRetry ? <Button title="Prøv igjen" onPress={onRetry} /> : null}</Card>; }
