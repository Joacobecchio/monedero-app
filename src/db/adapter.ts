export * from "./types";
export { db } from "./sqlite";
import { ensureMigrations } from "./sqlite"; 

let _ready = false;
async function initIfNeeded() {
  if (_ready) return;
  await ensureMigrations();
  _ready = true;
}

// y en todos los métodos del db:
await initIfNeeded();