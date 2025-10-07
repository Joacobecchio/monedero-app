import * as SQLite from 'expo-sqlite';
import type { DB, Tx } from './adapter';

const conn = SQLite.openDatabaseSync('wallet.db');

function ensureTable() {
  try {
    conn.execSync(`
      CREATE TABLE IF NOT EXISTS txs (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        description TEXT,
        occurred_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  } catch (err) {
    console.error('Error ensuring txs table:', err);
  }
}

export const db: DB = {
  async init() {
    // Creamos tabla al inicializar
    ensureTable();
  },

  async insertTx(tx: Tx) {
    ensureTable(); // 🔒 aseguro existencia antes de insertar

    conn.runSync(
      `INSERT INTO txs (id,type,amount_cents,currency,description,occurred_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        tx.id,
        tx.type,
        tx.amount_cents,
        tx.currency,
        tx.description ?? '',
        tx.occurred_at,
        tx.created_at,
        tx.updated_at,
      ]
    );
  },

  async listByRange(start, end) {
    ensureTable(); // 🔒 aseguro existencia antes de leer

    const rows = conn.getAllSync(
      `SELECT * FROM txs WHERE occurred_at BETWEEN ? AND ? ORDER BY occurred_at ASC`,
      [start, end]
    );

    return rows as Tx[];
  },

  async count() {
    ensureTable();
    const r = conn.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM txs');
    return r?.c ?? 0;
  },
};
