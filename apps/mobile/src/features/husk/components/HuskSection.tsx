import { StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import type { ReactNode } from "react";
export function HuskSection({ title, children }: { title: string; children: ReactNode }) { return <View style={styles.section}><AppText variant="heading">{title}</AppText>{children}</View>; }
const styles = StyleSheet.create({ section: { gap: theme.spacing.md } });
