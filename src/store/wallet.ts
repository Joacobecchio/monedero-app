// src/store/wallet.ts
import { create } from "zustand";
import { supabase } from "../lib/supabase";

/* ---------- Tipos ---------- */
export type TxType = "DEPOSIT" | "EXPENSE";
export type Currency = "ARS" | "USD";

export type Tx = {
  id: string;
  user_id: string;
  type: TxType;
  amount_cents: number;
  currency: Currency;
  description?: string | null;
  occurred_at: number; // epoch ms (UTC)
  created_at?: string | null;
};

export type DayAgg = { income: number; expense: number };

export type NewTx = {
  type: TxType;
  amount_cents: number;
  currency: Currency;
  description?: string;
  occurred_at?: number; // epoch ms UTC
};

export type UpdateTxPatch = Partial<
  Pick<Tx, "type" | "amount_cents" | "currency" | "description" | "occurred_at">
>;

/* ---------- helpers ---------- */
function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function thisMonth() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function rangeMonthUtc(isoYYYYMM: string) {
  const [y, m] = isoYYYYMM.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1, 0, 0, 0, 0);
  const end = Date.UTC(y, m, 1, 0, 0, 0, 0);
  return { startMs: start, endMs: end };
}
function dayStartUtcMs(isoDay: string) {
  return new Date(`${isoDay}T00:00:00.000Z`).getTime();
}

/* ---------- Zustand Store ---------- */
interface WalletState {
  month: string;
  selected: string;
  byDay: Record<string, DayAgg>;
  dayTxs: Tx[];
  loading: boolean;

  init: () => Promise<void>;
  setMonth: (isoYYYYMM: string) => Promise<void>;
  setSelected: (isoDay: string) => Promise<void>;

  addTx: (p: NewTx) => Promise<void>;
  getTx: (id: string) => Promise<Tx | null>;
  removeTx: (id: string) => Promise<void>;
  updateTx: (id: string, patch: UpdateTxPatch) => Promise<void>;
}

export const useWallet = create<WalletState>((set, get) => ({
  month: thisMonth(),
  selected: fmtDate(new Date()),
  byDay: {},
  dayTxs: [],
  loading: false,

  /* ---------------- INIT ---------------- */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      set({ byDay: {}, dayTxs: [] });
      return;
    }

    const { month, selected } = get();
    await get().setMonth(month);
    await get().setSelected(selected);
  },

  /* ---------------- setMonth ---------------- */
  setMonth: async (iso) => {
    set({ loading: true, month: iso });

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) {
      set({ loading: false });
      return;
    }

    const { startMs, endMs } = rangeMonthUtc(iso);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", startMs)
      .lt("occurred_at", endMs)
      .order("occurred_at", { ascending: false });

    if (error) {
      console.error("Error loading month:", error.message);
      set({ byDay: {}, dayTxs: [], loading: false });
      return;
    }

    const rows = (data ?? []) as Tx[];
    const agg: Record<string, DayAgg> = {};
    for (const r of rows) {
      const day = fmtDate(new Date(r.occurred_at));
      if (!agg[day]) agg[day] = { income: 0, expense: 0 };
      if (r.type === "DEPOSIT") agg[day].income += r.amount_cents;
      else agg[day].expense += r.amount_cents;
    }

    set({ byDay: agg, loading: false });
    await get().setSelected(get().selected);
  },

  /* ---------------- setSelected ---------------- */
  setSelected: async (isoDay) => {
    set({ selected: isoDay, loading: true });

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) {
      set({ dayTxs: [], loading: false });
      return;
    }

    const start = dayStartUtcMs(isoDay);
    const end = start + 24 * 60 * 60 * 1000;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: false });

    if (error) {
      console.error("Error loading day:", error.message);
      set({ dayTxs: [], loading: false });
      return;
    }

    set({ dayTxs: data ?? [], loading: false });
  },

  /* ---------------- addTx ---------------- */
  addTx: async (p) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) throw new Error("No user session");

    const now = Date.now();
    const tx: Omit<Tx, "id"> = {
      user_id: userId,
      type: p.type,
      amount_cents: p.amount_cents,
      currency: p.currency,
      description: p.description,
      occurred_at: p.occurred_at ?? now,
    };

    const { error } = await supabase.from("transactions").insert(tx);
    if (error) throw error;

    // Refrescar estado
    await get().setMonth(get().month);
    await get().setSelected(get().selected);
  },

  /* ---------------- getTx ---------------- */
  getTx: async (id) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as Tx;
  },

  /* ---------------- removeTx ---------------- */
  removeTx: async (id) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;

    await get().setMonth(get().month);
    await get().setSelected(get().selected);
  },

  /* ---------------- updateTx ---------------- */
  updateTx: async (id, patch) => {
    const { error } = await supabase
      .from("transactions")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    await get().setMonth(get().month);
    await get().setSelected(get().selected);
  },
}));
