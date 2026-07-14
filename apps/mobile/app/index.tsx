import { useEffect } from "react";
import { router } from "expo-router";
import BootstrapScreen from "./splash";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function IndexRoute() {
  const { isRestoring, isAuthenticated } = useAuth();
  useEffect(() => {
    if (isRestoring) return;
    const navigation = requestAnimationFrame(() => {
      router.replace(isAuthenticated ? "/(app)/(tabs)" : "/(auth)/login");
    });
    return () => cancelAnimationFrame(navigation);
  }, [isAuthenticated, isRestoring]);

  return <BootstrapScreen />;
}
