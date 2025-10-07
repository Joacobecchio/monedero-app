import { View, Text, Button } from 'react-native';
// Update the import path below if your db module is located elsewhere
import { db } from '../src/db/sqlite';
import { v4 as uuid } from 'uuid';

export default function DbCheck() {
return (
<View style={{ padding: 16, gap: 12 }}>
<Text style={{ fontSize: 18, fontWeight: '700' }}>Prueba de DB</Text>
<Button
title="Insertar depósito demo"
onPress={() => {
const now = Date.now();
db.runSync(
`INSERT INTO transactions (id,type,amount_cents,currency,description,occurred_at,created_at,updated_at)
VALUES (?,?,?,?,?,?,?,?)`,
[uuid(), 'DEPOSIT', 100000, 'ARS', 'Demo', now, now, now]
);
alert('OK: insertado AR$ 1000,00');
}}
/>
<Button
title="Contar filas"
onPress={() => {
const row = db.getFirstSync<{ c: number }>(`SELECT COUNT(1) as c FROM transactions`);
alert(`Transacciones en DB: ${row?.c ?? 0}`);
}}
/>
</View>
);
}