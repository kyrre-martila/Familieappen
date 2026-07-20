import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, BackHandler, findNodeHandle, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button } from "../../components";
import { theme } from "../../theme/tokens";
import { useAuth } from "../auth/AuthProvider";

type MenuOverlayProps = { visible: boolean; onClose: () => void };
type MenuItem = { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; description: string };

const MENU_ITEMS: MenuItem[] = [
  { label: "Profil", icon: "person-circle-outline", description: "Administrer brukeren din" },
  { label: "Familie", icon: "people-outline", description: "Medlemmer og invitasjoner" },
  { label: "Kalender", icon: "calendar-outline", description: "Kalenderinnstillinger" },
  { label: "Varsler", icon: "notifications-outline", description: "Push og påminnelser" },
  { label: "Innstillinger", icon: "settings-outline", description: "Tilpass FamilieAppen" },
  { label: "Hjelp", icon: "help-circle-outline", description: "Få hjelp og veiledning" },
  { label: "Om FamilieAppen", icon: "information-circle-outline", description: "Versjon og informasjon" }
];

export function MenuOverlay({ visible, onClose }: MenuOverlayProps) {
  const { logout, isLoggingOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(width)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonRef = useRef<View>(null);
  const drawerWidth = Math.min(Math.max(width * 0.86, 304), 420);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: visible ? 0 : drawerWidth, duration: visible ? 260 : 210, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: visible ? 1 : 0, duration: visible ? 220 : 180, useNativeDriver: true })
    ]).start(() => {
      if (visible) {
        AccessibilityInfo.announceForAccessibility("Meny åpnet");
        const node = findNodeHandle(closeButtonRef.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      } else {
        AccessibilityInfo.announceForAccessibility("Meny lukket");
      }
    });
  }, [backdropOpacity, drawerWidth, translateX, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, visible]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx > 64 || gesture.vx > 0.65) onClose();
    }
  })).current;

  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable accessibilityLabel="Lukk meny" accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View accessibilityLabel="Meny" accessibilityRole="menu" accessibilityViewIsModal importantForAccessibility="yes" style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top + theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          <View style={styles.header}>
            <View>
              <AppText variant="label">FamilieAppen</AppText>
              <AppText variant="heading">Meny</AppText>
            </View>
            <Pressable ref={closeButtonRef} accessibilityLabel="Lukk meny" accessibilityRole="button" hitSlop={12} onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {MENU_ITEMS.map((item) => <MenuRow key={item.label} item={item} />)}
          </ScrollView>
          <View style={styles.footer}>
            <Button accessibilityLabel="Logg ut" disabled={isLoggingOut} onPress={() => void logout()} title={isLoggingOut ? "Logger ut…" : "Logg ut"} variant="secondary" />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  return <Pressable accessibilityRole="menuitem" accessibilityLabel={item.label} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.icon}><Ionicons name={item.icon} size={22} color={theme.colors.primaryStrong} /></View><View style={styles.rowText}><AppText style={styles.rowTitle}>{item.label}</AppText><AppText variant="small" style={styles.rowDescription}>{item.description}</AppText></View><Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} /></Pressable>;
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: "flex-end" }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(21, 31, 25, 0.42)" }, drawer: { height: "100%", backgroundColor: theme.colors.background, borderTopLeftRadius: theme.radius.lg, borderBottomLeftRadius: theme.radius.lg, ...theme.shadow.floating }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }, closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }, content: { padding: theme.spacing.lg, gap: theme.spacing.sm }, row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }, icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft }, rowText: { flex: 1 }, rowTitle: { fontWeight: "800" }, rowDescription: { color: theme.colors.textMuted }, footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, padding: theme.spacing.lg, backgroundColor: theme.colors.background }, pressed: { opacity: 0.72 } });
