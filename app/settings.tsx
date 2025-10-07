// app/settings.tsx
import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ThemedView, ThemedText } from "../src/ui/Themed";
import Button from "../src/ui/Button";
import {
  loadPrefs,
  savePrefs,
  type Currency,
} from "../src/store/prefs";
import { useTheme } from "../src/theme/theme";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import i18n from "../src/i18n"; // ← ajusta esta ruta si tu i18n está en otro lugar

const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "UY", name: "Uruguay" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Perú" },
  { code: "MX", name: "México" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const router = useRouter();

  // estado editable
  const [country, setCountry] = useState<string>("AR");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(true);
  const [countryModal, setCountryModal] = useState(false);

  // cargar prefs al montar
  useEffect(() => {
    (async () => {
      const p = await loadPrefs();
      setCountry(p.country ?? "AR");
      setCurrency(p.currency ?? "ARS");
      setLanguage((p.language as "es" | "en") ?? "es");
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  const selectedCountry =
    COUNTRIES.find((c) => c.code === country)?.name || country;

  async function handleSave() {
    const prev = await loadPrefs();
    const next = { ...prev, country, currency, language };
    await savePrefs(next);

    // aplicar idioma ya mismo
    try {
      i18n.changeLanguage(next.language);
    } catch (_) {
      // si no tenés i18n, podés ignorar esto
    }

    // volver a la pantalla anterior (opcional)
    // router.back();
  }

  async function handleRestartOnboarding() {
    const prev = await loadPrefs();
    await savePrefs({ ...prev, onboarded: false });
    router.replace("/onboarding");
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        style={{
          flex: 1,
          paddingTop: insets.top + 10,
          backgroundColor: tokens.background,
        }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
            Configuración
          </ThemedText>

          {/* País */}
          <ThemedText>País</ThemedText>
          <Pressable
            onPress={() => setCountryModal(true)}
            style={{
              borderWidth: 1,
              borderColor: tokens.border,
              backgroundColor: tokens.card,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 12,
            }}
          >
            <ThemedText>
              {selectedCountry} ({country})
            </ThemedText>
          </Pressable>

          {/* Moneda */}
          <ThemedText style={{ marginTop: 12 }}>Moneda</ThemedText>
          <ThemedView style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title="ARS"
              kind={currency === "ARS" ? "primary" : "ghost"}
              onPress={() => setCurrency("ARS")}
            />
            <Button
              title="USD"
              kind={currency === "USD" ? "primary" : "ghost"}
              onPress={() => setCurrency("USD")}
            />
          </ThemedView>

          {/* Idioma */}
          <ThemedText style={{ marginTop: 12 }}>Idioma</ThemedText>
          <ThemedView style={{ flexDirection: "row", gap: 8 }}>
            <Button
              title="Español"
              kind={language === "es" ? "primary" : "ghost"}
              onPress={() => setLanguage("es")}
            />
            <Button
              title="English"
              kind={language === "en" ? "primary" : "ghost"}
              onPress={() => setLanguage("en")}
            />
          </ThemedView>

          {/* Acciones */}
          <Button title="Guardar" onPress={handleSave} style={{ marginTop: 16 }} />
          <Button title="Reiniciar Onboarding" kind="danger" onPress={handleRestartOnboarding} />
        </ScrollView>

        {/* Modal País (backdrop hermano para no cerrarse al tocar el picker) */}
        <Modal
          visible={countryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setCountryModal(false)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <TouchableWithoutFeedback onPress={() => setCountryModal(false)}>
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: "#0007",
                }}
              />
            </TouchableWithoutFeedback>

            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: tokens.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 12,
              }}
            >
              <ThemedText style={{ fontWeight: "700", marginBottom: 6 }}>
                Elegí tu país
              </ThemedText>

              <Picker
                selectedValue={country}
                onValueChange={(v) => setCountry(String(v))}
                dropdownIconColor={tokens.text}
                style={{ color: tokens.text }}
              >
                {COUNTRIES.map((c) => (
                  <Picker.Item
                    key={c.code}
                    label={`${c.name} (${c.code})`}
                    value={c.code}
                  />
                ))}
              </Picker>

              <Button title="Listo" onPress={() => setCountryModal(false)} />
            </Pressable>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
