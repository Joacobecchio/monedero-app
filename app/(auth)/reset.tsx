// app/(auth)/reset.tsx
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView, ThemedText } from "../../src/ui/Themed";
import Input from "../../src/ui/Input";
import Button from "../../src/ui/Button";
import { useTheme } from "../../src/theme/theme";
import { supabase } from "../../src/lib/supabase";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleReset() {
    setErr(null);
    setMsg(null);

    if (!email) {
      setErr(t("auth.resetEmailRequired"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: "exp://127.0.0.1:19000/--/(auth)/reset-complete", // ⚙️ ajustá tu deep link si hace falta
      });
      if (error) throw error;
      setMsg(t("auth.resetEmailSent"));
    } catch (e: any) {
      setErr(e?.message ?? t("auth.resetEmailFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ThemedView style={{ flex: 1, paddingHorizontal: 18, paddingTop: insets.top + 8 }}>
            <View style={{ marginTop: 6, marginBottom: 18 }}>
              <ThemedText style={{ fontSize: 28, fontWeight: "900" }}>
                {t("auth.resetTitle")}
              </ThemedText>
              <ThemedText style={{ opacity: 0.7, marginTop: 6 }}>
                {t("auth.resetSubtitle")}
              </ThemedText>
            </View>

            <ThemedView style={{ backgroundColor: tokens.card, borderRadius: 18, padding: 16, gap: 12 }}>
              <ThemedText style={{ fontWeight: "700" }}>{t("auth.emailLabel")}</ThemedText>

              <Input
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Ionicons name="mail-outline" size={18} color={tokens.text} />}
              />

              {err ? <ThemedText style={{ color: "#ef4444" }}>{err}</ThemedText> : null}
              {msg ? <ThemedText style={{ color: "#22c55e" }}>{msg}</ThemedText> : null}

              <Button title={t("auth.resetButton")} onPress={handleReset} loading={loading} />
            </ThemedView>
          </ThemedView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
