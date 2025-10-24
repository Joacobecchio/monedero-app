import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ThemeProvider, useTheme } from "../src/theme/theme";
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
import "../src/i18n";

/* --------------------------------------------------------
   GATE: controla si el usuario ve (auth) o (app)
--------------------------------------------------------- */
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Cada vez que cambia el estado de sesión
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    // Si no hay sesión y no está en (auth), redirigimos a login
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
    // Si hay sesión y está en (auth), redirigimos al home
    else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  // Stack principal (usa tu theme actual)
  const { tokens } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false, // sin barra superior
        contentStyle: { backgroundColor: tokens.background },
      }}
    />
  );
}

/* --------------------------------------------------------
   ROOT: provee Theme + Auth a toda la app
--------------------------------------------------------- */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}
