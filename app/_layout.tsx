import { Stack } from "expo-router";
import { ThemeProvider, useTheme } from "../src/theme/theme";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Inner />
    </ThemeProvider>
  );
}

function Inner() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,                    // ← oculta la barra blanca
        contentStyle: { backgroundColor: tokens.background },
      }}
    />
  );
}
