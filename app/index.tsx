// app/index.tsx
import React, { useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Pressable,
  Animated,
  Easing,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

import { ThemedView, ThemedText } from "../src/ui/Themed";
import { useTheme } from "../src/theme/theme";
import { loadPrefs, type Prefs } from "../src/store/prefs";
import { useWallet } from "../src/store/wallet";
import type { Tx } from "../src/db/adapter";

/* ---------------- utils ---------------- */
function formatAmount(
  cents: number,
  currency: "ARS" | "USD",
  opts?: { sign?: "auto" | "always" | "never" }
) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      signDisplay: opts?.sign ?? "auto",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sign =
      amount < 0 ? "-" : opts?.sign === "always" && amount > 0 ? "+" : "";
    const symbol = currency === "USD" ? "US$" : "$";
    return `${sign}${symbol} ${Math.abs(amount).toFixed(2)}`;
  }
}
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ------- Modal simple para ver el número completo ------- */
function AmountModal({
  data,
  onClose,
}: {
  data: { title: string; value: string; tint?: string } | null;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.96)).current;

  React.useEffect(() => {
    if (!data) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [data]);

  const close = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, { toValue: 0.96, duration: 120, useNativeDriver: true }),
    ]).start(onClose);
  };

  if (!data) return null;
  return (
    <Animated.View
      style={{
        position: "absolute",
        inset: 0 as any,
        backgroundColor: "rgba(0,0,0,0.5)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        opacity,
      }}
    >
      <Pressable onPress={close} style={{ position: "absolute", inset: 0 as any }} />
      <Animated.View
        style={{
          minWidth: 260,
          borderRadius: 16,
          padding: 18,
          backgroundColor: tokens.card,
          gap: 6,
          transform: [{ scale }],
        }}
      >
        <ThemedText style={{ fontSize: 14, opacity: 0.7 }}>{data.title}</ThemedText>
        <ThemedText style={{ fontSize: 24, fontWeight: "800", color: data.tint ?? tokens.text }}>
          {data.value}
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

/* ------- Card de totales (abre modal) ------- */
function StatCard({
  label,
  valueCents,
  currency,
  onPress,
}: {
  label: string;
  valueCents: number;
  currency: "ARS" | "USD";
  onPress?: () => void;
}) {
  const { tokens } = useTheme();
  const color =
    valueCents < 0 ? "#ef4444" : valueCents > 0 ? "#22c55e" : tokens.text;

  const Content = (
    <>
      <ThemedText style={{ opacity: 0.7 }}>{label}</ThemedText>
      <ThemedText
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ fontSize: 20, fontWeight: "800", color, includeFontPadding: false }}
      >
        {formatAmount(valueCents, currency, { sign: "auto" })}
      </ThemedText>
    </>
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: tokens.card, borderRadius: 16, padding: 12 }}>
      {onPress ? <Pressable onPress={onPress}>{Content}</Pressable> : Content}
    </ThemedView>
  );
}

/* ---------------- screen ---------------- */
export default function Home() {
  const router = useRouter();
  const { tokens } = useTheme();

  // wallet store
  const month = useWallet((s) => s.month);
  const selected = useWallet((s) => s.selected);
  const dayTxs = useWallet((s) => s.dayTxs);
  const byDay = useWallet((s) => s.byDay);
  const init = useWallet((s) => s.init);
  const setMonth = useWallet((s) => s.setMonth);
  const setSelected = useWallet((s) => s.setSelected);

  // NUEVO: acciones (editar/eliminar)
  const removeTx = useWallet((s) => s.removeTx);

  // prefs + modal
  const [prefs, setPrefs] = React.useState<Prefs | null>(null);
  const [amountModal, setAmountModal] = React.useState<{
    title: string;
    value: string;
    tint?: string;
  } | null>(null);

  // NUEVO: estado del modal de acciones
  const [actionsFor, setActionsFor] = React.useState<Tx | null>(null);

  // cargar prefs + init DB/store al enfocar
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        const p = await loadPrefs();
        if (mounted) setPrefs(p);
      })();

      (async () => {
        try {
          await init();
        } catch {}
      })();

      return () => {
        mounted = false;
      };
    }, [init])
  );

  // --- FIX de arranque: sincronizar una sola vez a HOY ---
  const bootSynced = React.useRef(false);
  React.useEffect(() => {
    if (bootSynced.current) return;

    const tm = thisMonth(); // 'YYYY-MM' actual
    const td = todayIso();  // 'YYYY-MM-DD' hoy

    if (!month || !/^\d{4}-\d{2}$/.test(month) || month !== tm) {
      setMonth(tm);
    }
    if (!selected || !/^\d{4}-\d{2}-\d{2}$/.test(selected) || !selected.startsWith(tm)) {
      setSelected(td);
    }

    bootSynced.current = true;
  }, [month, selected, setMonth, setSelected]);

  // (opcional) mantener month alineado con selected si cambia por otra vía
  React.useEffect(() => {
    const mFromSel = (selected || "").slice(0, 7);
    if (mFromSel && mFromSel !== month) setMonth(mFromSel);
  }, [selected, month, setMonth]);

  // fallbacks defensivos para el render
  const monthSafe = /^\d{4}-\d{2}$/.test(month || "") ? (month as string) : thisMonth();
  const selectedSafe =
    /^\d{4}-\d{2}-\d{2}$/.test(selected || "") ? (selected as string) : `${monthSafe}-01`;

  // El mes que mostramos siempre lo derivamos de la fecha seleccionada
  const displayMonth = selectedSafe.slice(0, 7);
  const currentStr = `${displayMonth}-15`;

  // marcadores calendario
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    if (byDay) {
      Object.entries(byDay).forEach(([day, agg]) => {
        const income = (agg as any).income || 0;
        const expense = (agg as any).expense || 0;
        if (income > 0 || expense > 0) {
          const dotColor = income >= expense ? "#22c55e" : "#ef4444";
          m[day] = { marked: true, dotColor };
        }
      });
    }
    if (selected && /^\d{4}-\d{2}-\d{2}$/.test(selected)) {
      m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: tokens.primary };
    }
    return m;
  }, [byDay, selected, tokens.primary]);

  /* -------- Header con cards -------- */
  function Header() {
    const totals = byDay?.[selected || ""] || { income: 0, expense: 0 };
    const currency = (prefs?.currency ?? "ARS") as "ARS" | "USD";
    const incomeCents = totals.income || 0;
    const expenseCents = totals.expense || 0;
    const balanceCents = incomeCents - expenseCents;

    const openAmount = (title: string, cents: number) => {
      const tint = cents < 0 ? "#ef4444" : cents > 0 ? "#22c55e" : undefined;
      setAmountModal({ title, value: formatAmount(cents, currency, { sign: "auto" }), tint });
    };

    return (
      <ThemedView style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 8 }}>
        <ThemedText style={{ fontSize: 28, fontWeight: "800" }}>Monedero</ThemedText>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard
            label="Depósitos"
            valueCents={incomeCents}
            currency={currency}
            onPress={() => openAmount("Depósitos", incomeCents)}
          />
          <StatCard
            label="Gastos"
            valueCents={-expenseCents}
            currency={currency}
            onPress={() => openAmount("Gastos", -expenseCents)}
          />
          <StatCard
            label="Balance"
            valueCents={balanceCents}
            currency={currency}
            onPress={() => openAmount("Balance", balanceCents)}
          />
        </View>
      </ThemedView>
    );
  }

  /* -------- NUEVO: Modal de acciones por movimiento -------- */
  function ActionsModal() {
    if (!actionsFor) return null;
    const tx = actionsFor;

    const onEdit = () => {
      setActionsFor(null);
      router.push({ pathname: "/add-transaction", params: { id: tx.id } });
    };

    const onDelete = () => {
      Alert.alert(
        tx.type === "DEPOSIT" ? "Eliminar depósito" : "Eliminar gasto",
        "¿Querés eliminar este movimiento?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Sí, eliminar",
            style: "destructive",
            onPress: async () => {
              await removeTx(tx.id);
              setActionsFor(null);
            },
          },
        ]
      );
    };

    return (
      <Modal transparent animationType="fade" visible onRequestClose={() => setActionsFor(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setActionsFor(null)}
        />
        <ThemedView
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            borderRadius: 16,
            padding: 12,
            gap: 6,
            backgroundColor: tokens.card,
          }}
        >
          <Pressable
            onPress={onEdit}
            style={{ paddingVertical: 12, alignItems: "center" }}
          >
            <ThemedText style={{ fontWeight: "700" }}>Editar</ThemedText>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={{ paddingVertical: 12, alignItems: "center" }}
          >
            <ThemedText style={{ fontWeight: "700", color: "#ef4444" }}>
              Eliminar
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActionsFor(null)}
            style={{ paddingVertical: 12, alignItems: "center" }}
          >
            <ThemedText style={{ opacity: 0.8 }}>Cancelar</ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      {/* top bar minimal (solo ⚙️ a la derecha) */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center" }}>
        <ThemedText style={{ fontSize: 18, fontWeight: "700", flex: 1 }}> </ThemedText>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="settings-outline" size={22} color={tokens.text} />
        </Pressable>
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            <Header />
            <Calendar
              key={displayMonth}               // fuerza remount cuando cambia el mes mostrado
              current={currentStr}
              markedDates={marked}
              theme={{
                calendarBackground: tokens.background,
                dayTextColor: tokens.text,
                monthTextColor: tokens.text,
                textDisabledColor: "#666",
                arrowColor: tokens.text,
                selectedDayBackgroundColor: tokens.primary,
                selectedDayTextColor: tokens.onPrimary ?? "#000",
                todayTextColor: tokens.primary,
              } as any}
              onDayPress={(d) => setSelected(d.dateString)}
              onMonthChange={(m) => {
                const mStr = `${m.year}-${String(m.month).padStart(2, "0")}`;
                setMonth(mStr);
                const t = todayIso();
                setSelected(t.startsWith(mStr) ? t : `${mStr}-01`);
              }}
              style={{ marginHorizontal: 8, borderRadius: 12, overflow: "hidden" }}
            />

            <ThemedText style={{ paddingHorizontal: 16, paddingTop: 14, fontWeight: "700" }}>
              Movimientos del {selectedSafe}
            </ThemedText>
          </>
        }
        data={dayTxs || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120, gap: 10 }}
        renderItem={({ item }) => {
          const currency = (prefs?.currency as "ARS" | "USD") ?? "ARS";
          const isDeposit = item.type === "DEPOSIT";

          // Íconos por categoría (extraídos del [Categoría] en descripción)
          const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Sueldo: "cash",
            Transferencia: "swap-horizontal",
            Ahorros: "wallet",
            Comida: "fast-food",
            Salud: "medkit",
            Facturas: "document-text",
            Compras: "cart",
            Transporte: "car",
            Otros: "ellipsis-horizontal-circle",
          };
          const match = item.description?.match(/\[(.*?)\]/);
          const category = match ? match[1] : null;
          const iconName = category ? categoryIcons[category] : null;
          const cleanDescription = item.description?.replace(/\s*\[.*?\]\s*/g, "");

          return (
            <Pressable onLongPress={() => setActionsFor(item)} delayLongPress={250}>
              <ThemedView
                style={{
                  backgroundColor: tokens.card,
                  borderRadius: 16,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {iconName && (
                  <Ionicons
                    name={iconName as any}
                    size={22}
                    color={isDeposit ? "#22c55e" : "#ef4444"}
                    style={{ marginLeft: 4 }}
                  />
                )}

                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontWeight: "700" }}>
                    {isDeposit ? "Depósito" : "Gasto"}
                  </ThemedText>
                  {cleanDescription ? (
                    <ThemedText style={{ opacity: 0.8 }}>{cleanDescription}</ThemedText>
                  ) : null}
                </View>

                <ThemedText
                  style={{
                    fontWeight: "700",
                    color: isDeposit ? "#22c55e" : "#ef4444",
                  }}
                >
                  {isDeposit ? "+" : "-"} {formatAmount(item.amount_cents, currency)}
                </ThemedText>
              </ThemedView>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/add-transaction")}
        style={{
          position: "absolute",
          right: 18,
          bottom: 28,
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tokens.primary,
        }}
      >
        <ThemedText style={{ fontSize: 28, fontWeight: "800", color: tokens.onPrimary ?? "#111" }}>+</ThemedText>
      </Pressable>

      {/* Modal para ver números completos */}
      <AmountModal data={amountModal} onClose={() => setAmountModal(null)} />

      {/* NUEVO: modal de acciones editar/eliminar */}
      <ActionsModal />
    </SafeAreaView>
  );
}
