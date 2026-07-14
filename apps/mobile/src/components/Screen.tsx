import { type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/tokens";
export function Screen({ children, scroll = true, style }: { children: ReactNode; scroll?: boolean; style?: ViewStyle }) { const insets = useSafeAreaInsets(); const contentStyle = [styles.content, { paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.xxl }, style]; return scroll ? <ScrollView style={styles.root} contentContainerStyle={contentStyle}>{children}</ScrollView> : <View style={[styles.root, contentStyle]}>{children}</View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, content: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg } });
