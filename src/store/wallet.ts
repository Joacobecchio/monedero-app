// src/store/wallet.ts
import { create } from "zustand";
import { db, type Tx, type TxType } from "../db/adapter";
import { uuidv4 } from "../utils/uuid";

/* ---------- helpers de fecha (UTC–safe) ---------- */
function fmtDate(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}
function dayStartUtcMs(isoDay: string) {
  // isoDay: 'YYYY-MM-DD'
  return new Date(`${isoDay}T00:00:00.000Z`).getTime();
}
function rangeMonthUtc(isoYYYYMM: string) {
  // isoYYYYMM: 'YYYY-MM'
  const [y, m] = isoYYYYMM.split("-").map(Number);
  const start = Date.UTC(y, m - 1, 1, 0, 0, 0, 0);
  const end = Date.UTC(y, m, 1, 0, 0, 0, 0); // exclusivo
  return { startMs: start, endMs: end };
}
function thisMonth() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

/* ---------- agregados ---------- */
export type DayAgg = { income: number; expense: number };

/* ---------- payloads ---------- */
export type NewTx = {
  type: TxType;
  amount_cents: number;
  currency: "ARS" | "USD";
  description?: string;
  occurred_at?: number; // ms UTC; si no viene, ahora
};

export type UpdateTxPatch = Partial<
  Pick<Tx, "type" | "amount_cents" | "currency" | "description" | "occurred_at">
>;

interface WalletState {
  month: string;               // 'YYYY-MM'
  selected: string;            // 'YYYY-MM-DD'
  byDay: Record<string, DayAgg>;
  dayTxs: Tx[];
  loading: boolean;

  init: () => Promise<void>;
  setMonth: (isoYYYYMM: string) => Promise<void>;
  setSelected: (isoDay: string) => Promise<void>;

  addTx: (p: NewTx) => Promise<void>;

  // NUEVO: CRUD extra
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

  init: async () => {
    const { month, selected } = get();
    await get().setMonth(month);
    await get().setSelected(selected);
  },

  setMonth: async (iso) => {
    set({ loading: true, month: iso });

    const { startMs, endMs } = rangeMonthUtc(iso);
    const rows = await db.listByRange(startMs, endMs);

    const agg: Record<string, DayAgg> = {};
    for (const r of rows) {
      const day = fmtDate(new Date(r.occurred_at));
      if (!agg[day]) agg[day] = { income: 0, expense: 0 };
      if (r.type === "DEPOSIT") agg[day].income += r.amount_cents;
      else agg[day].expense += r.amount_cents;
    }

    set({ byDay: agg, loading: false });

    // refrescar el día actual seleccionado (sigue en el mismo mes)
    await get().setSelected(get().selected);
  },

  setSelected: async (isoDay) => {
    set({ selected: isoDay, loading: true });

    const start = dayStartUtcMs(isoDay);
    const end = start + 24 * 60 * 60 * 1000; // exclusivo
    const rows = await db.listByRange(start, end);

    set({ dayTxs: rows, loading: false });
  },

  addTx: async (p) => {
    const now = Date.now();
    const id = await uuidv4();

    const tx: Tx = {
      id,
      type: p.type,
      amount_cents: p.amount_cents,
      currency: p.currency,
      description: p.description,
      occurred_at: p.occurred_at ?? now,
      created_at: now,
      updated_at: now,
    };

    await db.insertTx(tx);

    // actualizar agregados del mes en memoria
    const day = fmtDate(new Date(tx.occurred_at));
    const byDay = { ...get().byDay };
    if (!byDay[day]) byDay[day] = { income: 0, expense: 0 };
    if (tx.type === "DEPOSIT") byDay[day].income += tx.amount_cents;
    else byDay[day].expense += tx.amount_cents;
    set({ byDay });

    // si coincide con el día seleccionado, refrescar lista
    if (get().selected === day) {
      await get().setSelected(day);
    }
  },

  /* ---------------- NUEVO: helpers CRUD ---------------- */

  getTx: async (id) => {
    const row = await db.getById(id); // <-- añadí este método en tu adapter si no existe
    return row ?? null;
  },

  removeTx: async (id) => {
    const tx = await get().getTx(id);
    if (!tx) return;

    await db.deleteTx(id); // <-- añadí este método en tu adapter si no existe

    // actualizar agregados del día
    const day = fmtDate(new Date(tx.occurred_at));
    const byDay = { ...get().byDay };
    if (!byDay[day]) byDay[day] = { income: 0, expense: 0 };
    if (tx.type === "DEPOSIT") byDay[day].income -= tx.amount_cents;
    else byDay[day].expense -= tx.amount_cents;

    // si querés limpiar el día cuando queda en cero, descomentá:
    // if (byDay[day].income === 0 && byDay[day].expense === 0) delete byDay[day];

    // si estamos parados en ese día, sacar de la lista visible
    let dayTxs = get().dayTxs;
    if (get().selected === day) {
      dayTxs = dayTxs.filter((t) => t.id !== id);
    }

    set({ byDay, dayTxs });
  },

  updateTx: async (id, patch) => {
    const oldTx = await get().getTx(id);
    if (!oldTx) return;

    const updated: Tx = {
      ...oldTx,
      ...patch,
      updated_at: Date.now(),
    };

    await db.updateTx(updated); // <-- añadí este método en tu adapter si no existe

    // recomputar agregados: restar viejo / sumar nuevo
    const dayOld = fmtDate(new Date(oldTx.occurred_at));
    const dayNew = fmtDate(new Date(updated.occurred_at));

    const byDay = { ...get().byDay };

    // restar viejo
    if (!byDay[dayOld]) byDay[dayOld] = { income: 0, expense: 0 };
    if (oldTx.type === "DEPOSIT") byDay[dayOld].income -= oldTx.amount_cents;
    else byDay[dayOld].expense -= oldTx.amount_cents;

    // sumar nuevo
    if (!byDay[dayNew]) byDay[dayNew] = { income: 0, expense: 0 };
    if (updated.type === "DEPOSIT") byDay[dayNew].income += updated.amount_cents;
    else byDay[dayNew].expense += updated.amount_cents;

    // actualizar lista si el seleccionado coincide
    const sel = get().selected;
    let dayTxs = get().dayTxs;

    if (sel === dayOld && sel === dayNew) {
      dayTxs = dayTxs.map((t) => (t.id === id ? updated : t));
    } else if (sel === dayOld) {
      dayTxs = dayTxs.filter((t) => t.id !== id);
    } else if (sel === dayNew) {
      // si cayó en el día seleccionado actual, lo agrego
      dayTxs = [...dayTxs.filter((t) => t.id !== id), updated];
    }

    set({ byDay, dayTxs });
  },
}));
