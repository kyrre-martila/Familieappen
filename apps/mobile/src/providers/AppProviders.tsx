import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createQueryClient } from "../lib/query/client";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></SafeAreaProvider></GestureHandlerRootView>;
}
