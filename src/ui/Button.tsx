import { Pressable, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';


export default function Button({ title, onPress, kind='primary', loading=false, style }:{ title:string; onPress:()=>void; kind?:'primary'|'ghost'|'danger'; loading?:boolean; style?:ViewStyle; }){
const { tokens } = useTheme();
const bg = kind==='primary'? tokens.primary : kind==='danger'? tokens.danger : 'transparent';
const fg = kind==='primary'? tokens.onPrimary : kind==='danger'? tokens.text : tokens.text;
const border = kind==='ghost'? tokens.border : 'transparent';
return (
<Pressable onPress={loading? undefined : onPress} style={[{ backgroundColor:bg, borderColor:border, borderWidth:1, paddingVertical:12, paddingHorizontal:16, borderRadius: 8, alignItems:'center' }, style]}>
{loading? <ActivityIndicator color={fg}/> : <Text style={{ color: fg, fontWeight:'700' }}>{title}</Text>}
</Pressable>
);
}