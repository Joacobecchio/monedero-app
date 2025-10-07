PRAGMA journal_mode = WAL;


CREATE TABLE IF NOT EXISTS transactions (
id TEXT PRIMARY KEY,
type TEXT NOT NULL CHECK (type IN ('DEPOSIT','EXPENSE')),
amount_cents INTEGER NOT NULL,
currency TEXT NOT NULL CHECK (currency IN ('ARS','USD')),
description TEXT,
occurred_at INTEGER NOT NULL,
created_at INTEGER NOT NULL,
updated_at INTEGER NOT NULL
);


CREATE INDEX IF NOT EXISTS idx_tx_occurred_at ON transactions (occurred_at);