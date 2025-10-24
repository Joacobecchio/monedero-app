// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { ThemedView, ThemedText } from "../../src/ui/Themed";
import Input from "../../src/ui/Input";
import Button from "../../src/ui/Button";
import { useTheme } from "../../src/theme/theme";
import { useAuth } from "../../src/auth/AuthProvider";
import i18n from "../../src/i18n";
import { loadPrefs, savePrefs } from "../../src/store/prefs";
import { useTranslation } from "react-i18next";

export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const { signIn } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hidePass, setHidePass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<"es" | "en">(i18n.language.startsWith("es") ? "es" : "en");

  // cambia idioma y lo persiste
  async function changeLang(next: "es" | "en") {
    setLang(next);
    await i18n.changeLanguage(next);
    const cur = await loadPrefs();
    await savePrefs({ ...(cur || {}), language: next, onboarded: true });
  }

  async function handleLogin() {
    setErr(null);
    if (!email || !password) {
      setErr(lang === "es" ? "Completá email y contraseña." : "Enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setErr(e?.message ?? (lang === "es" ? "No pudimos iniciar sesión." : "Could not sign in."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ThemedView style={{ flex: 1, paddingHorizontal: 18, paddingTop: insets.top + 8 }}>
            {/* Branding */}
            <View style={{ alignItems: "center", marginTop: 6, marginBottom: 22 }}>
              <ThemedView
                style={{
                  width: 68, height: 68, borderRadius: 20, backgroundColor: tokens.card,
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
                }}
              >
                <Ionicons name="wallet-outline" size={30} color={tokens.text} />
              </ThemedView>

<ThemedText style={{ fontSize: 28, fontWeight: "800", textAlign: "center" }}>
  {t("auth.loginTitle")}
</ThemedText>
              <ThemedText style={{ opacity: 0.7, marginTop: 4 }}>
                {lang === "es" ? "Entrá para seguir con tu monedero" : "Sign in to continue"}
              </ThemedText>
            </View>

            {/* Tarjeta */}
            <ThemedView style={{ backgroundColor: tokens.card, borderRadius: 18, padding: 16, gap: 14 }}>
              {/* Selector de idioma */}
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                {(["es", "en"] as const).map(code => {
                  const active = lang === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => changeLang(code)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? tokens.primary : tokens.border,
                        backgroundColor: active ? "#2A2754" : "transparent",
                      }}
                    >
                      <ThemedText style={{ fontWeight: "800", opacity: active ? 1 : 0.8 }}>
                        {code.toUpperCase()}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Email */}
              <View style={{ gap: 6 }}>
                <ThemedText style={{ fontWeight: "700" }}>
                  {lang === "es" ? "Email" : "Email"}
                </ThemedText>
<Input
  placeholder={t("auth.emailPlaceholder")}
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  leftIcon={<Ionicons name="mail-outline" size={18} color={tokens.text} />}
/>
              </View>

              {/* Password */}
              <View style={{ gap: 6 }}>
                <ThemedText style={{ fontWeight: "700" }}>
                  {lang === "es" ? "Contraseña" : "Password"}
                </ThemedText>
                <Input
                  placeholder={lang === "es" ? "••••••••" : "••••••••"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={hidePass}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  leftIcon={<Ionicons name="lock-closed-outline" size={18} color={tokens.text} />}
                  rightIcon={
                    <Pressable onPress={() => setHidePass(v => !v)} hitSlop={10}>
                      <Ionicons
                        name={hidePass ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={tokens.text}
                      />
                    </Pressable>
                  }
                />
              </View>

              {/* Error */}
              {err ? (
                <ThemedText style={{ color: "#ef4444", fontWeight: "600" }}>{err}</ThemedText>
              ) : null}

              {/* CTA */}
              <Button title={lang === "es" ? "Ingresar" : "Log in"} onPress={handleLogin} loading={loading} />

              {/* Acciones (wrap para que no se salga) */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <Button
                  title={lang === "es" ? "¿Olvidaste tu contraseña?" : "Forgot password?"}
                  onPress={() => router.push("/(auth)/reset")}
                  variant="ghost"
                  compact
                  style={{ flexGrow: 1, flexBasis: "48%" }}
                />
                <Button
                  title={lang === "es" ? "Crear cuenta" : "Create account"}
                  onPress={() => router.push("/(auth)/register")}
                  variant="ghost"
                  compact
                  style={{ flexGrow: 1, flexBasis: "48%" }}
                />
              </View>
            </ThemedView>

            <ThemedText style={{ textAlign: "center", opacity: 0.5, marginTop: 18, fontSize: 12 }}>
              {lang === "es"
                ? "Al continuar aceptás nuestros términos y políticas."
                : "By continuing you agree to our terms and policies."}
            </ThemedText>
          </ThemedView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
