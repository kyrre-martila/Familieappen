import { useEffect } from "react";
import { router } from "expo-router";
import BootstrapScreen from "./splash";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function IndexRoute() {
  const { isRestoring, isAuthenticated, authDestination } = useAuth();
  useEffect(() => {
    if (isRestoring) return;
    const navigation = requestAnimationFrame(() => {
      router.replace(isAuthenticated ? authDestination : "/(auth)/login");
    });
    return () => cancelAnimationFrame(navigation);
  }, [authDestination, isAuthenticated, isRestoring]);

  return <BootstrapScreen />;
}
