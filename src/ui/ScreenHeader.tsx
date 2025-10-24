import React from "react";
import { View } from "react-native";
import { ThemedText } from "./Themed";

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 4 }}>
      <ThemedText style={{ fontSize: 28, fontWeight: "800" }}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText style={{ fontSize: 15, opacity: 0.7 }}>{subtitle}</ThemedText>
      ) : null}
    </View>
  );
}
