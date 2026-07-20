import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../features/auth/AuthProvider";
import { resolveApiAssetUrl } from "../lib/api/assets";
import { appAssets } from "../theme/assets";
import { theme } from "../theme/tokens";
import { AppText } from "./AppText";

type HeaderOverlay = "menu" | "notifications" | "profile" | null;
type AppHeaderOverlayContextValue = { activeOverlay: HeaderOverlay; openOverlay: (overlay: Exclude<HeaderOverlay, null>) => void; closeOverlay: () => void };
const AppHeaderOverlayContext = createContext<AppHeaderOverlayContextValue | null>(null);

export function AppHeaderOverlayProvider({ children }: { children: ReactNode }) {
  const [activeOverlay, setActiveOverlay] = useState<HeaderOverlay>(null);
  const openOverlay = useCallback((overlay: Exclude<HeaderOverlay, null>) => setActiveOverlay(overlay), []);
  const closeOverlay = useCallback(() => setActiveOverlay(null), []);
  const value = useMemo(() => ({ activeOverlay, openOverlay, closeOverlay }), [activeOverlay, closeOverlay, openOverlay]);
  return <AppHeaderOverlayContext.Provider value={value}>{children}</AppHeaderOverlayContext.Provider>;
}

export function useAppHeaderOverlay() {
  const value = useContext(AppHeaderOverlayContext);
  if (!value) throw new Error("useAppHeaderOverlay must be used within AppHeaderOverlayProvider");
  return value;
}

export function AppHeader({ title, notificationCount = 0 }: { title: string; notificationCount?: number }) {
  const insets = useSafeAreaInsets();
  const { user, isRestoring, logout, isLoggingOut } = useAuth();
  const { activeOverlay, openOverlay, closeOverlay } = useAppHeaderOverlay();
  const initials = getInitials(user?.displayName || user?.name || user?.email || "");
  const avatarUrl = resolveApiAssetUrl(user?.avatarUrl);
  const badgeLabel = getBadgeLabel(notificationCount);
  return <>
    <View style={[styles.header, { paddingTop: insets.top + theme.spacing.xs }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Gå til Hjem" hitSlop={8} onPress={() => router.replace("/(app)/(tabs)")} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <Image source={appAssets.brandIcon} contentFit="contain" style={styles.brandIcon} />
      </Pressable>
      <AppText variant="heading" numberOfLines={1} style={styles.title}>{title}</AppText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel={badgeLabel ? `Varsler, ${badgeLabel}` : "Varsler"} accessibilityHint="Åpner informasjon om varsler" onPress={() => openOverlay("notifications")} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={23} color={theme.colors.text} />
          {badgeLabel ? <View style={styles.badge}><AppText style={styles.badgeText}>{badgeLabel}</AppText></View> : null}
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Åpne profilmeny" accessibilityHint="Viser profilvalg og utlogging" onPress={() => openOverlay("profile")} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
          <Avatar initials={initials} avatarUrl={avatarUrl} loading={isRestoring} />
        </Pressable>
      </View>
    </View>
    <HeaderPopover visible={activeOverlay === "notifications"} onClose={closeOverlay} accessibilityLabel="Varsler">
      <View style={styles.popoverHeader}><Ionicons name="notifications-outline" size={22} color={theme.colors.primaryStrong} /><AppText style={styles.popoverTitle}>Varsler</AppText></View>
      <AppText style={styles.popoverMuted}>Varsler kommer snart.</AppText>
    </HeaderPopover>
    <HeaderPopover visible={activeOverlay === "profile"} onClose={closeOverlay} accessibilityLabel="Profilmeny">
      <View style={styles.profileHeader}><Avatar initials={initials} avatarUrl={avatarUrl} loading={isRestoring} /><View style={styles.profileText}><AppText style={styles.popoverTitle} numberOfLines={1}>{user?.displayName || user?.name || "FamilieAppen"}</AppText><AppText variant="small" style={styles.popoverMuted} numberOfLines={1}>{user?.email ?? "Laster bruker …"}</AppText></View></View>
      <Pressable disabled accessibilityRole="menuitem" accessibilityState={{ disabled: true }} accessibilityLabel="Profil, ikke tilgjengelig ennå" style={[styles.menuItem, styles.disabled]}><AppText style={styles.menuItemText}>Profil</AppText><AppText variant="small" style={styles.popoverMuted}>Kommer når profilrute finnes i appen.</AppText></Pressable>
      <Pressable disabled={isLoggingOut} accessibilityRole="menuitem" accessibilityLabel="Logg ut" onPress={() => { closeOverlay(); void logout(); }} style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}><AppText style={[styles.menuItemText, styles.logout]}>{isLoggingOut ? "Logger ut…" : "Logg ut"}</AppText></Pressable>
    </HeaderPopover>
  </>;
}

function HeaderPopover({ visible, onClose, accessibilityLabel, children }: { visible: boolean; onClose: () => void; accessibilityLabel: string; children: ReactNode }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent><Pressable accessibilityLabel="Lukk" accessibilityRole="button" style={styles.popoverBackdrop} onPress={onClose}><Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="menu" style={styles.popover} onPress={(event) => event.stopPropagation()}>{children}</Pressable></Pressable></Modal>;
}
function Avatar({ initials, avatarUrl, loading }: { initials: string; avatarUrl: string | null; loading: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);
  if (avatarUrl && !failed) return <Image source={{ uri: avatarUrl }} contentFit="cover" onError={() => setFailed(true)} style={styles.avatar} />;
  return <View style={[styles.avatar, loading && styles.avatarLoading]}><AppText style={styles.initials}>{loading ? "" : initials}</AppText></View>;
}
function getInitials(value: string) { const parts = value.trim().split(/\s+/).filter(Boolean); return ((parts[0]?.[0] ?? "F") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toLocaleUpperCase("nb-NO"); }
function getBadgeLabel(count: number) { if (count <= 0) return null; return count > 9 ? "9+" : String(count); }

const styles = StyleSheet.create({ header: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xs, backgroundColor: theme.colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }, iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24 }, brandIcon: { width: 34, height: 34 }, title: { position: "absolute", left: 96, right: 96, bottom: 17, textAlign: "center", color: theme.colors.heading }, actions: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }, actionButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: theme.colors.surface }, badge: { position: "absolute", top: 7, right: 5, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, backgroundColor: theme.colors.error }, badgeText: { color: theme.colors.surface, fontSize: 11, fontWeight: "900" }, avatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft }, avatarLoading: { opacity: 0.65 }, initials: { color: theme.colors.primaryStrong, fontWeight: "900" }, popoverBackdrop: { flex: 1, alignItems: "flex-end", paddingTop: 76, paddingHorizontal: theme.spacing.md, backgroundColor: "rgba(21, 31, 25, 0.16)" }, popover: { width: 280, gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, ...theme.shadow.floating }, popoverHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }, popoverTitle: { flexShrink: 1, fontWeight: "900", color: theme.colors.text }, popoverMuted: { color: theme.colors.textMuted }, profileHeader: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }, profileText: { flex: 1 }, menuItem: { minHeight: 48, justifyContent: "center", gap: 2, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.background }, menuItemText: { fontWeight: "800" }, disabled: { opacity: 0.55 }, logout: { color: theme.colors.error }, pressed: { opacity: 0.72 } });
