import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { _db, ensureMigrations } from "../src/db/sqlite";
import { v4 as uuid } from "uuid";

export default function DbCheck() {
  React.useEffect(() => {
    // Crea/actualiza el schema si hace falta (solo una vez)
    ensureMigrations().catch((e) => {
      console.error("ensureMigrations error", e);
      Alert.alert("DB", String(e));
    });
  }, []);

  const insertDemo = () => {
    try {
      const now = Date.now();
      // 👇 La tabla se llama txs
      _db.runSync(
        `INSERT INTO txs
          (id, type, amount_cents, currency, description, occurred_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), "DEPOSIT", 100000, "ARS", "Demo", now, now, now]
      );
      Alert.alert("OK", "Insertado AR$ 1.000,00 (100000 centavos)");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error insert", String(e?.message ?? e));
    }
  };

  const countRows = () => {
    try {
      const row = _db.getFirstSync<{ c: number }>(
        `SELECT COUNT(1) as c FROM txs`
      );
      Alert.alert("Filas", `Transacciones en DB: ${row?.c ?? 0}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error count", String(e?.message ?? e));
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Prueba de DB</Text>

      <Button title="Insertar depósito demo" onPress={insertDemo} />
      <Button title="Contar filas" onPress={countRows} />
    </View>
  );
}
