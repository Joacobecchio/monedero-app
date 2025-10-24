// app/index.tsx
import React, { useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Pressable,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";

import { ThemedView, ThemedText } from "../src/ui/Themed";
import { useTheme } from "../src/theme/theme";
import { loadPrefs, type Prefs } from "../src/store/prefs";
import { useWallet } from "../src/store/wallet";
import { ScreenHeader } from "../src/ui/ScreenHeader";
import { useTranslation } from "react-i18next";
import { useAuth } from "../src/auth/AuthProvider";

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

/* ------- Modal de confirmación ------- */
function ConfirmDialog({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { tokens } = useTheme();
  if (!visible) return null;

  return (
    <Pressable
      onPress={onCancel}
      style={{
        position: "absolute",
        inset: 0 as any,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Pressable
        onPress={() => {}}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          backgroundColor: tokens.card,
          overflow: "hidden",
        }}
      >
        <View style={{ padding: 16, gap: 6 }}>
          <ThemedText style={{ fontSize: 18, fontWeight: "800" }}>{title}</ThemedText>
          {message ? (
            <ThemedText style={{ opacity: 0.8 }}>{message}</ThemedText>
          ) : null}
        </View>

        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />

        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={onCancel}
            style={{ flex: 1, padding: 14, alignItems: "center" }}
          >
            <ThemedText style={{ fontWeight: "700" }}>{cancelText}</ThemedText>
          </Pressable>
          <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <Pressable
            onPress={onConfirm}
            style={{ flex: 1, padding: 14, alignItems: "center" }}
          >
            <ThemedText style={{ fontWeight: "700", color: "#ef4444" }}>
              {confirmText}
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  );
}

/* ------- ActionSheet (Editar / Eliminar) ------- */
function ActionSheet({
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { tokens } = useTheme();
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: "absolute",
        inset: 0 as any,
        backgroundColor: "rgba(0,0,0,0.45)",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Pressable
        onPress={() => {}}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          backgroundColor: tokens.card,
          overflow: "hidden",
        }}
      >
        <Pressable onPress={onEdit} style={{ padding: 16, alignItems: "center" }}>
          <ThemedText style={{ fontWeight: "700" }}>{t("common.edit")}</ThemedText>
        </Pressable>
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <Pressable onPress={onDelete} style={{ padding: 16, alignItems: "center" }}>
          <ThemedText style={{ fontWeight: "700", color: "#ef4444" }}>
            {t("common.delete")}
          </ThemedText>
        </Pressable>
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <Pressable onPress={onClose} style={{ padding: 16, alignItems: "center" }}>
          <ThemedText style={{ fontWeight: "700" }}>{t("common.cancel")}</ThemedText>
        </Pressable>
      </Pressable>
    </Pressable>
  );
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

/* ------- Card de totales ------- */
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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const [menuOpen, setMenuOpen] = React.useState(false);

  const goSettings = () => {
    setMenuOpen(false);
    router.push("/settings");
  };

  const doSignOut = async () => {
    setMenuOpen(false);
    try {
      await signOut();
    } catch {}
  };

  // hoja de acciones
  const [sheetTxId, setSheetTxId] = React.useState<string | null>(null);
  function openActions(txId: string) {
    setSheetTxId(txId);
  }
  const removeTx = useWallet((s) => s.removeTx);
  function handleEdit() {
    if (!sheetTxId) return;
    router.push({ pathname: "/add-transaction", params: { id: sheetTxId } });
  }

  // confirmación de borrado
  const [confirm, setConfirm] = React.useState<{ visible: boolean; id?: string }>({
    visible: false,
  });
  function handleDelete() {
    if (!sheetTxId) return;
    const id = sheetTxId;
    setSheetTxId(null);
    setConfirm({ visible: true, id });
  }

  // wallet store
  const month = useWallet((s) => s.month);
  const selected = useWallet((s) => s.selected);
  const dayTxs = useWallet((s) => s.dayTxs);
  const byDay = useWallet((s) => s.byDay);
  const init = useWallet((s) => s.init);
  const setMonth = useWallet((s) => s.setMonth);
  const setSelected = useWallet((s) => s.setSelected);

  // prefs + modal de totales
  const [prefs, setPrefs] = React.useState<Prefs | null>(null);
  const [amountModal, setAmountModal] = React.useState<{
    title: string;
    value: string;
    tint?: string;
  } | null>(null);

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

  // --- arranque: sincronizar a HOY ---
  const bootSynced = React.useRef(false);
  React.useEffect(() => {
    if (bootSynced.current) return;

    const tm = thisMonth();
    const td = todayIso();

    if (!month || !/^\d{4}-\d{2}$/.test(month) || month !== tm) {
      setMonth(tm);
    }
    if (!selected || !/^\d{4}-\d{2}-\d{2}$/.test(selected) || !selected.startsWith(tm)) {
      setSelected(td);
    }

    bootSynced.current = true;
  }, [month, selected, setMonth, setSelected]);

  // mantener month alineado con selected
  React.useEffect(() => {
    const mFromSel = (selected || "").slice(0, 7);
    if (mFromSel && mFromSel !== month) setMonth(mFromSel);
  }, [selected, month, setMonth]);

  // fallbacks
  const monthSafe = /^\d{4}-\d{2}$/.test(month || "") ? (month as string) : thisMonth();
  const selectedSafe =
    /^\d{4}-\d{2}-\d{2}$/.test(selected || "") ? (selected as string) : `${monthSafe}-01`;

  // mes mostrado derivado de selected
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

  /* -------- Stats (solo tarjetas) -------- */
  const StatsRow = () => {
    const totals = byDay?.[selected || ""] || { income: 0, expense: 0 };
    const currency = (prefs?.currency ?? "ARS") as "ARS" | "USD";
    const incomeCents = totals.income || 0;
    const expenseCents = totals.expense || 0;
    const balanceCents = incomeCents - expenseCents;

    const openAmount = (title: string, cents: number) => {
      const tint = cents < 0 ? "#ef4444" : cents > 0 ? "#22c55e" : undefined;
      setAmountModal({
        title,
        value: formatAmount(cents, currency, { sign: "auto" }),
        tint,
      });
    };

    return (
      <ThemedView style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard
            label={t("home.deposits")}
            valueCents={incomeCents}
            currency={currency}
            onPress={() => openAmount(t("home.deposits"), incomeCents)}
          />
        <StatCard
            label={t("home.expenses")}
            valueCents={-expenseCents}
            currency={currency}
            onPress={() => openAmount(t("home.expenses"), -expenseCents)}
          />
          <StatCard
            label={t("home.balance")}
            valueCents={balanceCents}
            currency={currency}
            onPress={() => openAmount(t("home.balance"), balanceCents)}
          />
        </View>
      </ThemedView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.background }}>
      {/* Top bar — sin título, solo engranaje */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="settings-outline" size={22} color={tokens.text} />
        </Pressable>
      </View>

      {/* Menú popup */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#0006" }} onPress={() => setMenuOpen(false)}>
          <ThemedView
            style={{
              position: "absolute",
              top: insets.top + 44,
              right: 12,
              backgroundColor: tokens.card,
              borderRadius: 12,
              paddingVertical: 6,
              width: 220,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Pressable onPress={goSettings} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <ThemedText style={{ fontWeight: "700" }}>{t("common.settings")}</ThemedText>
            </Pressable>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
            <Pressable onPress={doSignOut} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <ThemedText style={{ fontWeight: "700", color: "#ef4444" }}>
                {t("auth.signOut")}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Modal>

      {/* Lista + header */}
      <FlatList
        ListHeaderComponent={
          <>
            <ScreenHeader title={t("home.title")} />
            <StatsRow />
            <Calendar
              key={displayMonth}
              current={`${displayMonth}-15`}
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
                const tday = todayIso();
                setSelected(tday.startsWith(mStr) ? tday : `${mStr}-01`);
              }}
              style={{ marginHorizontal: 8, borderRadius: 12, overflow: "hidden" }}
            />

            <ThemedText style={{ paddingHorizontal: 16, paddingTop: 14, fontWeight: "700" }}>
              {t("home.movementsOf", { date: selectedSafe })}
            </ThemedText>
          </>
        }
        data={dayTxs || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120, gap: 10 }}
        renderItem={({ item }) => {
          const currency = (prefs?.currency as "ARS" | "USD") ?? "ARS";
          const isDeposit = item.type === "DEPOSIT";

          // Íconos por categoría (lee lo que guardaste entre [ ])
          const categoryAliases: Record<string, keyof typeof Ionicons.glyphMap> = {
            Sueldo: "cash", Salary: "cash",
            Transferencia: "swap-horizontal", Transfer: "swap-horizontal",
            Ahorros: "wallet", Savings: "wallet",
            Comida: "fast-food", Food: "fast-food",
            Salud: "medkit", Health: "medkit",
            Facturas: "document-text", Bills: "document-text",
            Compras: "cart", Shopping: "cart",
            Transporte: "car", Transport: "car",
            Otros: "ellipsis-horizontal-circle", Other: "ellipsis-horizontal-circle",
          };
          const match = item.description?.match(/\[(.*?)\]/);
          const categoryRaw = match ? match[1] : null;
          const iconName = categoryRaw ? categoryAliases[categoryRaw] : null;

          const cleanDescription = item.description?.replace(/\s*\[.*?\]\s*/g, "");

          return (
            <Pressable onPress={() => openActions(item.id)}>
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
                    {isDeposit ? t("tx.deposit") : t("tx.expense")}
                  </ThemedText>
                  {cleanDescription ? (
                    <ThemedText style={{ opacity: 0.8 }}>{cleanDescription}</ThemedText>
                  ) : null}
                </View>

                <ThemedText
                  style={{
                    fontWeight: "700",
                    color: isDeposit ? "#22c55e" : "#ef4444",
                    marginRight: 6,
                  }}
                >
                  {isDeposit ? "+" : "-"} {formatAmount(item.amount_cents, currency)}
                </ThemedText>

                <Pressable
                  hitSlop={10}
                  onPress={() => openActions(item.id)}
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={tokens.text} />
                </Pressable>
              </ThemedView>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <ThemedText style={{ opacity: 0.6, textAlign: "center", marginTop: 24 }}>
            {t("home.noMovements")}
          </ThemedText>
        }
      />

      {/* Modal para ver números completos */}
      <AmountModal data={amountModal} onClose={() => setAmountModal(null)} />

      {/* Hoja de acciones: Editar / Eliminar */}
      <ActionSheet
        visible={!!sheetTxId}
        onClose={() => setSheetTxId(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Confirmación de borrado */}
      <ConfirmDialog
        visible={confirm.visible}
        title={t("home.deleteConfirmTitle")}
        message={t("home.deleteConfirmMsg")}
        cancelText={t("common.cancel")}
        confirmText={t("common.delete")}
        onCancel={() => setConfirm({ visible: false })}
        onConfirm={async () => {
          const id = confirm.id!;
          setConfirm({ visible: false });
          try {
            await removeTx(id);
          } catch {}
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
          zIndex: 20,
          elevation: 6,
        }}
        hitSlop={10}
      >
        <ThemedText style={{ fontSize: 28, fontWeight: "800", color: tokens.onPrimary ?? "#111" }}>
          +
        </ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}
