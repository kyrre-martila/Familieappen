import { type ReactNode, type Ref } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme/tokens";

type BottomInset = "screen" | "tab" | "none";
type TopInset = "safe" | "none";

export function Screen({ children, scroll = true, style, bottomInset = "screen", topInset = "safe", refreshControl, scrollRef }: { children: ReactNode; scroll?: boolean; style?: ViewStyle; bottomInset?: BottomInset; topInset?: TopInset; refreshControl?: ScrollViewProps["refreshControl"]; scrollRef?: Ref<ScrollView> }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = bottomInset === "none" ? theme.spacing.xl : bottomInset === "tab" ? theme.spacing.xxl : insets.bottom + theme.spacing.xxl;
  const contentStyle = [styles.content, { paddingTop: topInset === "safe" ? insets.top + theme.spacing.lg : theme.spacing.lg, paddingBottom: bottomPadding }, style];
  return scroll ? <ScrollView ref={scrollRef} style={styles.root} contentContainerStyle={contentStyle} refreshControl={refreshControl}>{children}</ScrollView> : <View style={[styles.root, contentStyle]}>{children}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, content: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg } });
