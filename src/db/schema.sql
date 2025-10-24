PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS txs (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DEPOSIT','EXPENSE')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  occurred_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_txs_occurred ON txs(occurred_at);