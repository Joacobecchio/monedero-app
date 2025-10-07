// src/db/adapter.web.ts
import type { DB, Tx } from './adapter';

const KEY = 'wallet_txs_v1';

function getAll(): Tx[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Tx[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const db: DB = {
  async init() {},

  async insertTx(tx: Tx) {
    const all = getAll();
    all.push(tx);
    saveAll(all);
  },

  async listByRange(start, end) {
    const all = getAll();
    return all.filter((t) => t.occurred_at >= start && t.occurred_at < end);
  },

  async count() {
    return getAll().length;
  },
};