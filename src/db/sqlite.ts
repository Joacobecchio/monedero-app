// src/db/sqlite.ts
import * as SQLite from "expo-sqlite";
import { Asset } from "expo-asset";
import { readAsStringAsync } from "expo-file-system/legacy";
import type { Tx } from "./adapter"; // <- si tus tipos están en otro archivo, ajusta la ruta

/** DB singleton (API sync) */
const _db = SQLite.openDatabaseSync("monedero.db");

/** Ejecuta schema.sql (PRAGMA fuera de la tx; resto dentro) */
export async function ensureMigrations() {
  const asset = Asset.fromModule(require("./schema.sql"));
  await asset.downloadAsync();

  const sql = await readAsStringAsync(asset.localUri!);
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // PRAGMA (si viene primero) fuera de la transacción
  if (statements[0]?.toUpperCase().startsWith("PRAGMA")) {
    _db.execSync(statements.shift()!);
  }

  // Resto dentro de una transacción
  _db.withTransactionSync(() => {
    for (const s of statements) _db.execSync(s);
  });
}

/* ---------------- helpers ---------------- */
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

/* ---------------- métodos del adapter ---------------- */

/** Lista transacciones por rango [startMs, endMs) ordenadas por fecha */
async function listByRange(startMs: number, endMs: number): Promise<Tx[]> {
  const rows = _db.getAllSync(
    `SELECT * FROM txs
     WHERE occurred_at >= ? AND occurred_at < ?
     ORDER BY occurred_at ASC, created_at ASC`,
    [startMs, endMs]
  );
  return rows.map(rowToTx);
}

/** Inserta transacción */
async function insertTx(tx: Tx): Promise<void> {
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
}

/** Obtiene una transacción por id */
async function getById(id: string): Promise<Tx | null> {
  const row = _db.getFirstSync(`SELECT * FROM txs WHERE id = ?`, [id]);
  return row ? rowToTx(row) : null;
}

/** Actualiza una transacción completa (por id) */
async function updateTx(tx: Tx): Promise<void> {
  _db.runSync(
    `UPDATE txs
       SET type = ?,
           amount_cents = ?,
           currency = ?,
           description = ?,
           occurred_at = ?,
           updated_at = ?
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
}

/** Borra una transacción por id */
async function deleteTx(id: string): Promise<void> {
  _db.runSync(`DELETE FROM txs WHERE id = ?`, [id]);
}

/* ---------------- export adapter ---------------- */
export const db = {
  listByRange,
  insertTx,
  getById,
  updateTx,
  deleteTx,
};
