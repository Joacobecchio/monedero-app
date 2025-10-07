// app/add-transaction.tsx
import React from "react";
import {
  View,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedView, ThemedText } from "../src/ui/Themed";
import Button from "../src/ui/Button";
import Input from "../src/ui/Input";
import { useTheme } from "../src/theme/theme";
import { useWallet } from "../src/store/wallet";
import { loadPrefs } from "../src/store/prefs";

type TxKind = "DEPOSIT" | "EXPENSE";

interface CategoryOption {
  label: string;
  value: string;
  icon:
    | keyof typeof Ionicons.glyphMap
    | keyof typeof MaterialCommunityIcons.glyphMap;
}

/** YYYY-MM-DD -> timestamp local (mediodía para evitar TZ/DST weirdness) */
function isoDayToLocalMs(isoDay: string) {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

/** 123456 -> "123.456" */
function formatThousands(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function AddTransaction() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();

  // store
  const selected = useWallet((s) => s.selected);
  const month = useWallet((s) => s.month);
  const setMonth = useWallet((s) => s.setMonth);
  const setSelected = useWallet((s) => s.setSelected);

  const addTx = useWallet((s) => s.addTx);
  const getTx = useWallet((s) => s.getTx);
  const updateTx = useWallet((s) => s.updateTx);

  // params (modo edición si viene id)
  const params = useLocalSearchParams<{ id?: string }>();
  const txId = params?.id as string | undefined;

  // ui state
  const [kind, setKind] = React.useState<TxKind>("DEPOSIT");
  const [amount, setAmount] = React.useState(""); // visual con puntos
  const [desc, setDesc] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // 💰 Categorías visuales
  const depositCategories: CategoryOption[] = [
    { label: "Sueldo", value: "Sueldo", icon: "cash" },
    { label: "Transferencia", value: "Transferencia", icon: "swap-horizontal" },
    { label: "Ahorros", value: "Ahorros", icon: "wallet" },
  ];
  const expenseCategories: CategoryOption[] = [
    { label: "Comida", value: "Comida", icon: "fast-food" },
    { label: "Salud", value: "Salud", icon: "medkit" },
    { label: "Facturas", value: "Facturas", icon: "document-text" },
    { label: "Compras", value: "Compras", icon: "cart" },
    { label: "Transporte", value: "Transporte", icon: "car" },
    { label: "Otros", value: "Otros", icon: "ellipsis-horizontal-circle" },
  ];
  const categories = kind === "DEPOSIT" ? depositCategories : expenseCategories;

  // 🔢 Formateo visual del número (solo dígitos + separador de miles .)
  const formatNumber = (text: string) => {
    const clean = text.replace(/\D/g, "");
    const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setAmount(formatted);
  };
  const parseToCents = (formatted: string) => {
    const numeric = Number(formatted.replace(/\./g, ""));
    return numeric * 100;
  };

  const valid =
    !!amount &&
    Number(amount.replace(/\./g, "")) > 0 &&
    !!category &&
    !saving;

  // Prefill si estamos editando
  React.useEffect(() => {
    (async () => {
      if (!txId) return;
      const tx = await getTx(txId);
      if (!tx) return;

      // tipo
      setKind(tx.type as TxKind);

      // monto (a enteros con puntos)
      const units = Math.round(tx.amount_cents / 100); // asumiendo sin centavos
      setAmount(formatThousands(units));

      // categoría desde descripción "[Categoria]"
      let cat: string | null = null;
      if (tx.description) {
        const m = tx.description.match(/\[(.+?)\]\s*$/);
        if (m) cat = m[1];
      }
      setCategory(cat);

      // descripción limpia
      setDesc(tx.description ? tx.description.replace(/\s*\[.+\]\s*$/, "") : "");
    })();
  }, [txId, getTx]);

  const onSave = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      Keyboard.dismiss();

      const prefs = await loadPrefs();
      const currency = (prefs?.currency as "ARS" | "USD") ?? "ARS";
      const description =
        desc ? `${desc} [${category}]` : category ? `[${category}]` : undefined;

      if (txId) {
        // EDITAR: mantenemos occurred_at original (si querés editar fecha, lo sumamos luego)
        await updateTx(txId, {
          type: kind,
          amount_cents: parseToCents(amount),
          currency,
          description,
        });
      } else {
        // NUEVO: usar día seleccionado (o hoy si no hay)
        const occurredAt = selected ? isoDayToLocalMs(selected) : Date.now();

        // si el mes del seleccionado difiere del cargado, sincronizamos
        const selMonth = (selected ?? "").slice(0, 7);
        if (selMonth && selMonth !== month) {
          await setMonth(selMonth);
          await setSelected(selected!);
        }

        await addTx({
          type: kind,
          amount_cents: parseToCents(amount),
          currency,
          description,
          occurred_at: occurredAt,
        });
      }

      router.back();
    } finally {
      setSaving(false);
    }
  };

  // Si cambiás el tipo en edición y la categoría no aplica, la limpiamos
  React.useEffect(() => {
    if (!category) return;
    const pool = kind === "DEPOSIT" ? depositCategories : expenseCategories;
    if (!pool.find((c) => c.value === category)) {
      setCategory(null);
    }
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemedView style={{ flex: 1, backgroundColor: tokens.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: 16,
              gap: 20,
            }}
          >
            {/* Título */}
            <ThemedText style={{ fontSize: 28, fontWeight: "800" }}>
              {txId
                ? kind === "DEPOSIT"
                  ? "Editar depósito"
                  : "Editar gasto"
                : kind === "DEPOSIT"
                ? "Nuevo depósito"
                : "Nuevo gasto"}
            </ThemedText>

            {/* Selector tipo */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["DEPOSIT", "EXPENSE"] as TxKind[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setKind(t)}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor: kind === t ? tokens.card : "transparent",
                    borderWidth: 1,
                    borderColor:
                      kind === t ? tokens.card : "rgba(255,255,255,0.1)",
                  }}
                >
                  <ThemedText
                    style={{
                      fontWeight: "700",
                      color:
                        t === "DEPOSIT"
                          ? kind === t
                            ? "#22c55e"
                            : tokens.text
                          : kind === t
                          ? "#ef4444"
                          : tokens.text,
                    }}
                  >
                    {t === "DEPOSIT" ? "Depósito" : "Gasto"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Monto con ícono $ */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: tokens.card,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <ThemedText style={{ fontSize: 22, marginRight: 8, opacity: 0.8 }}>
                $
              </ThemedText>
              <Input
                value={amount}
                onChangeText={formatNumber}
                placeholder="Monto"
                keyboardType="number-pad"
                style={{ flex: 1, fontSize: 22 }}
              />
            </View>

            {/* Categorías con íconos */}
            <View style={{ gap: 10 }}>
              <ThemedText style={{ opacity: 0.7 }}>
                Selecciona una categoría
              </ThemedText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {categories.map((c) => (
                  <Pressable
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor:
                        category === c.value
                          ? kind === "DEPOSIT"
                            ? "rgba(34,197,94,0.2)"
                            : "rgba(239,68,68,0.2)"
                          : tokens.card,
                      borderWidth: category === c.value ? 1.5 : 0.5,
                      borderColor:
                        category === c.value
                          ? kind === "DEPOSIT"
                            ? "#22c55e"
                            : "#ef4444"
                          : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={18}
                      color={
                        category === c.value
                          ? kind === "DEPOSIT"
                            ? "#22c55e"
                            : "#ef4444"
                          : tokens.text
                      }
                    />
                    <ThemedText
                      style={{
                        color:
                          category === c.value
                            ? kind === "DEPOSIT"
                              ? "#22c55e"
                              : "#ef4444"
                            : tokens.text,
                        fontWeight: category === c.value ? "700" : "500",
                      }}
                    >
                      {c.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Descripción */}
            <Input
              value={desc}
              onChangeText={setDesc}
              placeholder="Descripción (opcional)"
              returnKeyType="done"
              onSubmitEditing={onSave}
            />

            {/* Botón Guardar */}
            <Button
              title={saving ? "Guardando..." : txId ? "Guardar cambios" : "Guardar"}
              kind="primary"
              style={{ marginTop: 8, opacity: valid ? 1 : 0.5 }}
              onPress={valid ? onSave : () => {}}
              loading={saving}
            />
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
