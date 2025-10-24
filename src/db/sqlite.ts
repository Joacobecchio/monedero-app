// src/db/sqlite.ts
import * as SQLite from "expo-sqlite";
import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system/legacy";
import type { DB, Tx } from "./types";

export const _db = SQLite.openDatabaseSync("monedero.db");

// ← NUEVO: flag + helper
let _ready = false;
async function initIfNeeded() {
  if (_ready) return;
  await ensureMigrations();
  _ready = true;
}

export async function ensureMigrations() {
  const asset = Asset.fromModule(require("./schema.sql"));
  await asset.downloadAsync();
  const sql = await readAsStringAsync(asset.localUri!);
  const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

  if (statements[0]?.toUpperCase().startsWith("PRAGMA")) {
    _db.execSync(statements.shift()!);
  }
  _db.withTransactionSync(() => {
    for (const s of statements) _db.execSync(s);
  });
}

  const txsExists = _db.getFirstSync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='txs'"
  )?.c ?? 0;

    const txsCount = txsExists
    ? (_db.getFirstSync<{ c: number }>("SELECT COUNT(*) AS c FROM txs")?.c ?? 0)
    : 0;

      const oldExists = _db.getFirstSync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='transactions'"
  )?.c ?? 0;

    _db.runSync(
      `INSERT INTO txs (id, type, amount_cents, currency, description, occurred_at, created_at, updated_at)
       SELECT id, type, amount_cents, currency, description, occurred_at, created_at, updated_at
       FROM transactions`
    );

function rowToTx(row: any): Tx {
  return {
    id: row.id,
    type: row.type,
    amount_cents: row.amount_cents,
    currency: row.currency,
    description: row.description ?? null,
    occurred_at: row.occurred_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const db: DB = {
  async init() {
    await initIfNeeded();
  },

  async listByRange(startMs: number, endMs: number): Promise<Tx[]> {
    await initIfNeeded(); // 👈 siempre listo
    const rows = _db.getAllSync(
      `SELECT * FROM txs
       WHERE occurred_at >= ? AND occurred_at < ?
       ORDER BY occurred_at ASC, created_at ASC`,
      [startMs, endMs]
    );
    return (rows ?? []).map(rowToTx);
  },

  async insertTx(tx: Tx): Promise<void> {
    await initIfNeeded();
    _db.runSync(
      `INSERT INTO txs
        (id, type, amount_cents, currency, description, occurred_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.type,
        tx.amount_cents,
        tx.currency,
        tx.description ?? null,
        tx.occurred_at,
        tx.created_at,
        tx.updated_at,
      ]
    );
  },

  async getById(id: string): Promise<Tx | null> {
    await initIfNeeded();
    const row = _db.getFirstSync(`SELECT * FROM txs WHERE id = ?`, [id]);
    return row ? rowToTx(row) : null;
  },

  async updateTx(tx: Tx): Promise<void> {
    await initIfNeeded();
    _db.runSync(
      `UPDATE txs
         SET type = ?, amount_cents = ?, currency = ?, description = ?,
             occurred_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        tx.type,
        tx.amount_cents,
        tx.currency,
        tx.description ?? null,
        tx.occurred_at,
        tx.updated_at,
        tx.id,
      ]
    );
  },

  async deleteTx(id: string): Promise<void> {
    await initIfNeeded();
    _db.runSync(`DELETE FROM txs WHERE id = ?`, [id]);
  },

  async count(): Promise<number> {
    await initIfNeeded();
    const r = _db.getFirstSync<{ c: number }>(`SELECT COUNT(*) as c FROM txs`);
    return r?.c ?? 0;
  },
};
