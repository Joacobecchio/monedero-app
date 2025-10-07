import { ThemedView, ThemedText } from '../src/ui/Themed';
import Button from '../src/ui/Button';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useWallet } from '../src/store/wallet';


export default function Inbox(){
const add = useWallet(s=>s.addTx);


async function importCsv(){
const res = await DocumentPicker.getDocumentAsync({ type:'text/csv' });
if(res.canceled || !res.assets?.length) return;
const uri = res.assets[0].uri;
const content = await FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });


// parse manual simple (CSV sin comillas ni separadores raros)
const lines = content.split(/\r?\n/).filter(Boolean);
for(const [i,line] of lines.entries()){
if(i===0 && /date\s*,/i.test(line)) continue; // skip header
const [date,type,amount_cents,currency,description] = line.split(',');
if(!date||!type||!amount_cents||!currency) continue;
const occurred_at = new Date(date.trim()+'T00:00:00').getTime();
await add({
type: type.trim() as any,
amount_cents: parseInt(amount_cents.trim(),10),
currency: (currency.trim() as any),
description: description?.trim() || undefined,
occurred_at
});
}
}


return (
<ThemedView style={{ flex:1, padding:16, gap:12 }}>
<ThemedText style={{ fontSize:20, fontWeight:'800' }}>Importar CSV</ThemedText>
<ThemedText>Formato: date,type,amount_cents,currency,description</ThemedText>
<Button title="Seleccionar archivo CSV" onPress={importCsv} />
</ThemedView>
);
}