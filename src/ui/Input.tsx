import { TextInput, TextInputProps } from 'react-native';
import { useTheme } from '../theme/theme';

// Define RADII locally if not exported from tokens
const RADII = { md: 8 };

export default function Input(props: TextInputProps){
const { tokens } = useTheme();
return (
<TextInput {...props} placeholderTextColor={tokens.text}
style={[{ borderWidth:1, borderColor:tokens.border, backgroundColor:tokens.card, color:tokens.text, borderRadius: RADII.md, paddingVertical:10, paddingHorizontal:12 }, props.style]}/>
);
}