import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';


export default function IconButton({name,onPress}:{name:keyof typeof Ionicons.glyphMap; onPress:()=>void}){
const { tokens } = useTheme();
return (
<Pressable onPress={onPress} style={{ padding:8 }}>
<Ionicons name={name} size={22} color={tokens.text} />
</Pressable>
);
}