// app/settings.tsx
import { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedView, ThemedText } from "../src/ui/Themed";
import Button from "../src/ui/Button";
import { loadPrefs, savePrefs, type Currency } from "../src/store/prefs";
import { useTheme } from "../src/theme/theme";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useTranslation } from "react-i18next";
import { useAuth } from "../src/auth/AuthProvider";
import { supabase } from "../src/lib/supabase";

const COUNTRIES = [
  { code: "AR" }, { code: "UY" }, { code: "CL" },
  { code: "PE" }, { code: "MX" }, { code: "ES" }, { code: "US" },
];

// Mini toast/badge arriba
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState<string | null>(null);
  const insets = useSafeAreaInsets(); // 👈 agregado

  function show(msg: string, duration = 1800) {
    setText(msg);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
          setText(null);
        });
      }, duration);
    });
  }

  const node = text ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        // 👇 bajamos un poco el toast y respetamos el notch
        top: insets.top + 10,
        alignItems: "center",
        opacity,
      }}
    >
      <ThemedView
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: "rgba(0,0,0,0.6)",
        }}
      >
        <ThemedText style={{ fontWeight: "700" }}>{text}</ThemedText>
      </ThemedView>
    </Animated.View>
  ) : null;

  return { show, node };
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { signOut, user } = useAuth();
  const toast = useToast();

  const [country, setCountry] = useState<string>("AR");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(true);
  const [countryModal, setCountryModal] = useState(false);

  // borrar cuenta
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const selectedCountry = t(`countries.${country}`);

  async function handleSave() {
    const prev = await loadPrefs();
    const next = { ...prev, country, currency, language };
    await savePrefs(next);

    try {
      i18n.changeLanguage(next.language);
    } catch {}
    toast.show(t("settings.saved"));
  }

  // ⚠️ Borrar cuenta
  async function reallyDeleteAccount() {
    setDeleting(true);
    try {
      // 1) Llamada opcional a Edge Function (server) que borra el usuario (admin).
      //    Implementá una function "delete-user" con service role y RLS seguro.
      //    Si aún no existe, este paso puede fallar silenciosamente y seguimos con el wipe local.
      try {
        await supabase.functions.invoke("delete-user", {
          body: { userId: user?.id },
        });
      } catch {
        // está bien si no la tenés todavía
      }

      // 2) Limpiar datos locales (prefs, DB local). Si tenés helpers en tu store, llamalos aquí.
      const prev = await loadPrefs();
      await savePrefs({ ...prev, onboarded: false }); // deja prefs en estado neutral

      // TODO: si tenés SQLite, ejecutá aquí deletes de tablas (txs, etc.)
      // await wipeLocalDatabase();

      // 3) Cerrar sesión y llevar a login
      await signOut();
      router.replace("/(auth)/login");
      toast.show(t("settings.deleteSuccess"));
    } catch {
      toast.show(t("settings.deleteError"));
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
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
        {/* Toast */}
        {toast.node}

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={{ fontSize: 34, fontWeight: "900" }}>
            {t("settings.title")}
          </ThemedText>

          {/* País */}
          <ThemedText>{t("settings.country")}</ThemedText>
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
          <ThemedText style={{ marginTop: 12 }}>{t("settings.currency")}</ThemedText>
          <ThemedView style={{ flexDirection: "row", gap: 8 }}>
            <Button title="ARS" variant={currency === "ARS" ? "primary" : "outline"} onPress={() => setCurrency("ARS")} />
            <Button title="USD" variant={currency === "USD" ? "primary" : "outline"} onPress={() => setCurrency("USD")} />
          </ThemedView>

          {/* Idioma */}
          <ThemedText style={{ marginTop: 12 }}>{t("settings.language")}</ThemedText>
          <ThemedView style={{ flexDirection: "row", gap: 8 }}>
            <Button title={t("common.spanish")} variant={language === "es" ? "primary" : "outline"} onPress={() => setLanguage("es")} />
            <Button title={t("common.english")} variant={language === "en" ? "primary" : "outline"} onPress={() => setLanguage("en")} />
          </ThemedView>

          {/* Guardar */}
          <Button title={t("settings.save")} onPress={handleSave} style={{ marginTop: 16 }} />

          {/* Borrar cuenta */}
          <Button
            title={t("settings.deleteAccount")}
            variant="danger"
            onPress={() => setConfirmDel(true)}
            style={{ marginTop: 10 }}
          />
        </ScrollView>

        {/* Modal País */}
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
                  left: 0, right: 0, top: 0, bottom: 0,
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
                {t("settings.country")}
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
                    label={`${t(`countries.${c.code}`)} (${c.code})`}
                    value={c.code}
                  />
                ))}
              </Picker>

              <Button title={t("common.done")} onPress={() => setCountryModal(false)} />
            </Pressable>
          </View>
        </Modal>

        {/* Confirmación borrar cuenta */}
        <Modal
          visible={confirmDel}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmDel(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "#0007", alignItems: "center", justifyContent: "center", padding: 24 }}
            onPress={() => setConfirmDel(false)}
          >
            <Pressable
              onPress={() => {}}
              style={{ width: "100%", maxWidth: 420, borderRadius: 16, backgroundColor: tokens.card, overflow: "hidden" }}
            >
              <View style={{ padding: 16, gap: 6 }}>
                <ThemedText style={{ fontSize: 18, fontWeight: "800" }}>
                  {t("settings.deleteConfirmTitle")}
                </ThemedText>
                <ThemedText style={{ opacity: 0.8 }}>
                  {t("settings.deleteConfirmMsg")}
                </ThemedText>
              </View>
              <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ flexDirection: "row" }}>
                <Pressable onPress={() => setConfirmDel(false)} style={{ flex: 1, padding: 14, alignItems: "center" }}>
                  <ThemedText style={{ fontWeight: "700" }}>{t("common.cancel")}</ThemedText>
                </Pressable>
                <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
                <Pressable onPress={reallyDeleteAccount} style={{ flex: 1, padding: 14, alignItems: "center" }}>
                  <ThemedText style={{ fontWeight: "700", color: "#ef4444" }}>
                    {deleting ? "…" : t("settings.deleteAccount")}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
