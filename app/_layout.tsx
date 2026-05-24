import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NewMessageBanner } from "@/components/ui/NewMessageBanner";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore, useTheme } from "@/store/themeStore";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isCheckingAuth, checkAuth } = useAuthStore();
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const { theme } = useTheme();

  useEffect(() => {
    loadTheme();
    checkAuth();
  }, [checkAuth, loadTheme]);

  useEffect(() => {
    if (!isCheckingAuth) {
      SplashScreen.hideAsync();
    }
  }, [isCheckingAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <StatusBar style={theme === "light" || theme === "cupcake" || theme === "retro" || theme === "valentine" ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="call"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#2F3136" },
            headerTintColor: "#FFFFFF",
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: "#2F3136" },
            headerTintColor: "#FFFFFF",
            presentation: "card",
          }}
        />
      </Stack>
      <NewMessageBanner />
      <IncomingCallModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
