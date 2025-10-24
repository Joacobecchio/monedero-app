import { Pressable, Text, ActivityIndicator, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../theme/theme";

type Variant = "primary" | "ghost" | "danger" | "outline";

export default function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  style,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const { tokens } = useTheme();

  const backgroundColor =
    variant === "primary" ? tokens.primary :
    variant === "danger"  ? tokens.danger  :
    variant === "outline" ? "transparent" :
    "transparent";

  const textColor =
    variant === "primary" ? (tokens.onPrimary ?? "#111") :
    variant === "danger"  ? tokens.text :
    tokens.text;

  const borderColor =
    variant === "outline" || variant === "ghost" ? tokens.border : "transparent";

  const baseStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth: variant === "outline" || variant === "ghost" ? 1 : 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center", // 👈 centra verticalmente el texto
    opacity: disabled ? 0.5 : 1,
    flexDirection: "row" // 🔹 por si agregás íconos en el futuro
  };

  return (
    <Pressable
      onPress={loading || disabled ? undefined : onPress}
      style={[baseStyle, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={{
            color: textColor,
            fontWeight: "800",
            textAlignVertical: "center", // 👈 extra para Android
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
