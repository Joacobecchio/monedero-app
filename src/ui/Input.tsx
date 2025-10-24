// src/ui/Input.tsx
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  Pressable,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "../theme/theme";

export type ThemedInputProps = TextInputProps & {
  /** ícono/elemento a la izquierda del input */
  leftIcon?: React.ReactNode;
  /** ícono/elemento a la derecha del input */
  rightIcon?: React.ReactNode;
  /** callback si querés que el ícono derecho sea presionable */
  onRightPress?: () => void;
  /** estilo para el contenedor externo */
  containerStyle?: StyleProp<ViewStyle>;
};

const Input = forwardRef<TextInput, ThemedInputProps>(
  ({ leftIcon, rightIcon, onRightPress, containerStyle, style, ...rest }, ref) => {
    const { tokens } = useTheme();
    const innerRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => innerRef.current as TextInput);

    return (
      <View
        style={[
          {
            height: 48,
            borderRadius: 12,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: (tokens as any).input ?? tokens.card,
          },
          containerStyle,
        ]}
      >
        {leftIcon ? <View style={{ opacity: 0.85 }}>{leftIcon}</View> : null}

        <TextInput
          ref={innerRef}
          placeholderTextColor={(tokens as any).muted ?? "#999"}
          style={[{ flex: 1, color: tokens.text, paddingVertical: 12 }, style]}
          {...rest}
        />

        {rightIcon ? (
          onRightPress ? (
            <Pressable onPress={onRightPress} hitSlop={10} style={{ opacity: 0.85 }}>
              {rightIcon}
            </Pressable>
          ) : (
            <View style={{ opacity: 0.85 }}>{rightIcon}</View>
          )
        ) : null}
      </View>
    );
  }
);

export default Input;
