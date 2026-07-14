import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme/tokens";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled mobile error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <View style={styles.card}>
            <Text allowFontScaling style={styles.label}>FamilieAppen</Text>
            <Text allowFontScaling accessibilityRole="header" style={styles.title}>Noe gikk galt</Text>
            <Text allowFontScaling style={styles.body}>Appen støtte på en uventet feil. Start appen på nytt hvis feilen vedvarer.</Text>
            <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })} style={styles.button}>
              <Text allowFontScaling style={styles.buttonText}>Prøv igjen</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  card: { gap: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: theme.spacing.lg },
  label: { color: theme.colors.primary, fontSize: theme.typography.small, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  title: { color: theme.colors.text, fontSize: theme.typography.heading, fontWeight: "800", lineHeight: 32 },
  body: { color: theme.colors.textMuted, fontSize: theme.typography.body, lineHeight: 24 },
  button: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  buttonText: { color: theme.colors.surface, fontSize: theme.typography.body, fontWeight: "800" }
});
