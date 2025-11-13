import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (isLoading) return;
    if (!navigationState?.key) return;

    const rootSegment = segments[0];
    const onLoginScreen = rootSegment === "login";

    if (!user) {
      if (!onLoginScreen) {
        router.replace("/login");
      }
      return;
    }

    if (onLoginScreen) {
      router.replace("/(tabs)");
    }
  }, [isLoading, navigationState?.key, router, segments, user]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [client] = useState(() => new QueryClient());
  const theme = useMemo(
    () => (colorScheme === "dark" ? DarkTheme : DefaultTheme),
    [colorScheme]
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <NavigationGuard>
            <ThemeProvider value={theme}>
              <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="reports/[id]"
                  options={{ title: "Handover" }}
                />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </NavigationGuard>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
