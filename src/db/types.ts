// src/db/types.ts
export type TxType = "DEPOSIT" | "EXPENSE";

export type Tx = {
  id: string;
  type: TxType;
  amount_cents: number;
  currency: "ARS" | "USD";
  description?: string | null;
  occurred_at: number;
  created_at: number;
  updated_at: number;
};

export interface DB {
  init(): Promise<void>;
  listByRange(startMs: number, endMs: number): Promise<Tx[]>;
  insertTx(tx: Tx): Promise<void>;
  getById(id: string): Promise<Tx | null>;
  updateTx(tx: Tx): Promise<void>;
  deleteTx(id: string): Promise<void>;
  count(): Promise<number>;
}
