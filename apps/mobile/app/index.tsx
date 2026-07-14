import { useEffect } from "react";
import { router } from "expo-router";
import BootstrapScreen from "./splash";

export default function IndexRoute() {
  useEffect(() => {
    const navigation = requestAnimationFrame(() => {
      router.replace("/login");
    });
    return () => cancelAnimationFrame(navigation);
  }, []);

  return <BootstrapScreen />;
}
