import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { useTheme } from '../theme/theme';


export function ThemedView({ style, ...rest }: ViewProps){
const { tokens } = useTheme();
return <View style={[{ backgroundColor: tokens.background }, style]} {...rest}/>;
}
export function ThemedText({ style, ...rest }: TextProps){
const { tokens } = useTheme();
return <Text style={[{ color: tokens.text, fontSize:15 }, style]} {...rest}/>;
}