// App.tsx (raíz)
import "react-native-gesture-handler";
import { Slot } from "expo-router";
import { ThemeProvider } from "./src/theme/theme";

export default function App() {
  return (
    <ThemeProvider>
      <Slot /> {/* Renderiza lo que está en /app */}
    </ThemeProvider>
  );
}
