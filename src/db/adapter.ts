// src/db/adapter.ts
export type TxType = 'DEPOSIT' | 'EXPENSE';


export type Tx = {
  id: string;
  type: TxType;
  amount_cents: number;
  currency: 'ARS' | 'USD';
  description?: string | null;
  occurred_at: number; // ms epoch UTC
  created_at: number;
  updated_at: number;
};

export interface DB {
  init(): Promise<void>;
  insertTx(tx: Tx): Promise<void>;
  listByRange(startMs: number, endMs: number): Promise<Tx[]>;
  count(): Promise<number>;
   getById(id: string): Promise<Tx | null>;
  updateTx(tx: Tx): Promise<void>;
  deleteTx(id: string): Promise<void>;
}

// Reexport automático según plataforma
export { db } from './adapter.native';