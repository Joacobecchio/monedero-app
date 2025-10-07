import { Modal, View } from 'react-native';
import Button from '../ui/Button';
import { useTheme } from '../theme/theme';
export default function AddTypeMenu({ visible, onClose, onSelect }:{
visible:boolean; onClose:()=>void; onSelect:(t:'DEPOSIT'|'EXPENSE')=>void; })
{
const { tokens } = useTheme();
return (
<Modal transparent visible={visible} animationType="fade"
onRequestClose={onClose}>
<View style={{ flex:1, backgroundColor:'#0007', justifyContent:'flex-end' }}>
<View style={{ backgroundColor: tokens.card, padding:16,
borderTopLeftRadius:20, borderTopRightRadius:20, gap:10 }}>
<Button title="Depósito" onPress={()=>{ onSelect('DEPOSIT');
onClose(); }} />
<Button title="Gasto" kind='danger' onPress={()=>{
onSelect('EXPENSE'); onClose(); }} />
<Button title="Cancelar" kind='ghost' onPress={onClose} />
</View>
</View>
</Modal>
);
}