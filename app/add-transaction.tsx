import React from "react";
import {
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThemedView, ThemedText } from "../src/ui/Themed";
import Input from "../src/ui/Input";
import Button from "../src/ui/Button";
import { useTheme } from "../src/theme/theme";
import { loadPrefs, type Prefs } from "../src/store/prefs";
import { useWallet } from "../src/store/wallet";
import i18n from "../src/i18n";

/* ------------------ categorías ------------------ */
const DEPOSIT_CATS = [
  { key: "salary", icon: "cash" as const, labelES: "Sueldo", labelEN: "Salary" },
  { key: "transfer", icon: "swap-horizontal" as const, labelES: "Transferencia", labelEN: "Transfer" },
  { key: "savings", icon: "wallet" as const, labelES: "Ahorros", labelEN: "Savings" },
];
const EXPENSE_CATS = [
  { key: "food", icon: "fast-food" as const, labelES: "Comida", labelEN: "Food" },
  { key: "health", icon: "medkit" as const, labelES: "Salud", labelEN: "Health" },
  { key: "bills", icon: "document-text" as const, labelES: "Facturas", labelEN: "Bills" },
  { key: "shopping", icon: "cart" as const, labelES: "Compras", labelEN: "Shopping" },
];

/* ------------- helpers moneda <-> centavos ------------- */
function nfFor(currency: "ARS" | "USD", lang: string) {
  const locale = lang?.startsWith("es") ? "es-AR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoney(cents: number, currency: "ARS" | "USD", lang: string) {
  try {
    return nfFor(currency, lang).format(cents / 100);
  } catch {
    const sign = cents < 0 ? "-" : "";
    const symb = currency === "USD" ? "US$" : "$";
    return `${sign}${symb} ${(Math.abs(cents) / 100).toFixed(2)}`;
  }
}

/** Convierte texto (con símbolos/puntos/comas) a centavos enteros */
function parseToCents(input: string) {
  const digits = (input || "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export default function AddTransaction() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();

  // Si venís a editar: /add-transaction?id=xxx (opcional)
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [prefs, setPrefs] = React.useState<Prefs | null>(null);
  React.useEffect(() => {
    (async () => setPrefs(await loadPrefs()))();
  }, []);

  // Store wallet
  const addTx = useWallet((s) => s.addTx);
  const daySelected = useWallet((s) => s.selected);

  // UI state
  const [type, setType] = React.useState<"DEPOSIT" | "EXPENSE">("DEPOSIT");
  const [amountCents, setAmountCents] = React.useState(0);
  const [amountDisplay, setAmountDisplay] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [desc, setDesc] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  const CATS = type === "DEPOSIT" ? DEPOSIT_CATS : EXPENSE_CATS;

  const currency = (prefs?.currency ?? "ARS") as "ARS" | "USD";
  const lang = i18n.language || "es-AR";

  // ✅ validación
  const isValid = amountCents > 0 && !!category;

  React.useEffect(() => {
    setAmountDisplay(formatMoney(amountCents, currency, lang));
  }, [currency, lang]);

  function handleAmountChange(txt: string) {
    const cents = parseToCents(txt);
    setAmountCents(cents);
    setAmountDisplay(formatMoney(cents, currency, lang));
  }

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      let finalDesc = desc?.trim() || "";
      if (category) {
        const catObj = [...DEPOSIT_CATS, ...EXPENSE_CATS].find((c) => c.key === category);
        const label = catObj ? (lang.startsWith("es") ? catObj.labelES : catObj.labelEN) : category;
        finalDesc = finalDesc ? `${finalDesc} [${label}]` : `[${label}]`;
      }

      await addTx({
        type,
        amount_cents: amountCents,
        currency,
        description: finalDesc || undefined,
        occurred_at: daySelected ? new Date(daySelected + "T00:00:00").getTime() : Date.now(),
      });

      router.back();
    } catch (e) {
      console.error("Error saving tx", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: tokens.background,
        paddingTop: insets.top + 14, // 👈 mejora visual
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ThemedView style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
              <ThemedText style={{ fontSize: 34, fontWeight: "900" }}>
                {type === "DEPOSIT" ? t("tx.newDeposit") : t("tx.newExpense")}
              </ThemedText>
            </View>

            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingBottom: 28,
                gap: 16,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Tabs Depósito/Gasto */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable
                  onPress={() => setType("DEPOSIT")}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: type === "DEPOSIT" ? "#122917" : tokens.card,
                    borderWidth: 1,
                    borderColor: type === "DEPOSIT" ? "#214D2D" : tokens.border,
                  }}
                >
                  <ThemedText style={{ fontWeight: "800", color: type === "DEPOSIT" ? "#22c55e" : tokens.text }}>
                    {t("tx.deposit")}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setType("EXPENSE")}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: type === "EXPENSE" ? "#2A1313" : tokens.card,
                    borderWidth: 1,
                    borderColor: type === "EXPENSE" ? "#4C1D1D" : tokens.border,
                  }}
                >
                  <ThemedText style={{ fontWeight: "800", color: type === "EXPENSE" ? "#ef4444" : tokens.text }}>
                    {t("tx.expense")}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Monto */}
              <Input
                placeholder={formatMoney(0, currency, lang)}
                value={amountDisplay}
                onChangeText={handleAmountChange}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                leftIcon={<Ionicons name="cash-outline" size={18} color={tokens.text} />}
              />

              {/* Categorías */}
              <View style={{ gap: 10 }}>
                <ThemedText style={{ opacity: 0.8, fontWeight: "700" }}>
                  {t("tx.selectCategory")}
                </ThemedText>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {CATS.map((c) => {
                    const selected = category === c.key;
                    const label = lang.startsWith("es") ? c.labelES : c.labelEN;
                    return (
                      <Pressable
                        key={c.key}
                        onPress={() => setCategory(selected ? null : c.key)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: selected ? tokens.primary : tokens.border,
                          backgroundColor: selected ? "#2A2754" : "transparent",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Ionicons
                          name={c.icon}
                          size={16}
                          color={selected ? tokens.primary : tokens.text}
                        />
                        <ThemedText style={{ fontWeight: "700" }}>{label}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Descripción */}
              <View style={{ gap: 6 }}>
                <Input
                  placeholder={t("tx.descriptionOptional")}
                  value={desc}
                  onChangeText={setDesc}
                  leftIcon={<Ionicons name="create-outline" size={18} color={tokens.text} />}
                  multiline
                  style={{ paddingTop: 12 }}
                />
                <ThemedText style={{ alignSelf: "flex-end", opacity: 0.5 }}>
                  {Math.max(0, 120 - (desc?.length || 0))} {t("tx.characters")}
                </ThemedText>
              </View>

              {/* Guardar */}
              <Button
                title={t("tx.save")}
                onPress={handleSave}
                loading={saving}
                disabled={!isValid}
                variant="primary"
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </ThemedView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
