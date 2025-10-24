import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedView, ThemedText } from "../../src/ui/Themed";
import Input from "../../src/ui/Input";
import Button from "../../src/ui/Button";
import { useTheme } from "../../src/theme/theme";
import { supabase } from "../../src/lib/supabase";
import { ScreenHeader } from "../../src/ui/ScreenHeader";
import { useTranslation } from "react-i18next";

export default function Register() {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const onRegister = async () => {
    setErr(""); setOk("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setLoading(false);
    if (error) setErr(error.message);
    else setOk(t("auth.checkInbox", { defaultValue: "Check your inbox to confirm." }));
    // si tenés auto-confirm ON, el Gate te redirige
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ThemedView style={{ flex: 1, padding: 16, gap: 16 }}>
          <ScreenHeader title={t("auth.registerTitle", { defaultValue: "Create account" })} />
          <Input placeholder={t("auth.email", { defaultValue: "Email" })} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Input placeholder={t("auth.password", { defaultValue: "Password" })} value={pass} onChangeText={setPass} secureTextEntry />

          {err ? <ThemedText style={{ color: "#ef4444" }}>{err}</ThemedText> : null}
          {ok ? <ThemedText style={{ color: "#22c55e" }}>{ok}</ThemedText> : null}

          <Button title={loading ? t("common.loading", { defaultValue: "Loading..." }) : t("auth.registerBtn", { defaultValue: "Sign up" })} onPress={onRegister} kind="primary" />
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
