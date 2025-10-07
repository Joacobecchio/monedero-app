import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/theme';
// Define RADII locally if not exported from tokens
const RADII = { lg: 16 }; // Adjust value as needed

export default function Card({ style, ...rest }: ViewProps){
const { tokens } = useTheme();
return (
<View style={[{ backgroundColor: tokens.card, borderColor: tokens.border, borderWidth:1, borderRadius: RADII.lg, padding: 16 }, style]} {...rest} />
);
}