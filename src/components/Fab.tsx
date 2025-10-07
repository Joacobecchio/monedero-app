import { Pressable, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';
export default function Fab({ onPress }:{ onPress:()=>void }){
const { tokens } = useTheme();
return (
<Pressable onPress={onPress}
style={{ position:'absolute', right:16, bottom:24, backgroundColor:
tokens.primary, borderRadius: 999, padding:16, elevation:4 }}>
<Ionicons name="add" size={28} color={tokens.onPrimary} />
</Pressable>
);
}
