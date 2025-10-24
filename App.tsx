// App.tsx (raíz)
import React from "react";
import "react-native-gesture-handler";
import { Slot } from "expo-router";
import "./src/i18n";  
import i18n from "./src/i18n";
import './src/i18n-calendar-setup';
import { ThemeProvider } from "./src/theme/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {

  React.useEffect(() => {
    (async () => {
      const prefs = await loadPrefs();
      const lang = (prefs?.lang === "en" ? "en" : "es");
      if (i18n.language !== lang) {
        await i18n.changeLanguage(lang);
      }
    })();
  }, []);
  return (
    <ThemeProvider>
      <Slot /> {/* Renderiza lo que está en /app */}
    </ThemeProvider>
  );
}
async function loadPrefs() {
  try {
    const prefsString = await AsyncStorage.getItem("prefs");
    if (prefsString) {
      return JSON.parse(prefsString);
    }
    return {};
  } catch (error) {
    console.error("Failed to load preferences:", error);
    return {};
  }
}

