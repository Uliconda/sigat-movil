import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "../theme/useTheme";

interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message?: string;
  /** Muestra un indicador de carga en lugar del ícono. */
  loading?: boolean;
}

// Mensaje centrado para listas vacías, búsquedas sin resultados o la primera carga.
export function EmptyState({ icon = "cube-outline", title, message, loading = false }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 50, paddingHorizontal: 20 }} accessibilityLiveRegion="polite">
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 15 }} />
      ) : (
        <Ionicons name={icon} size={48} color={colors.subText} style={{ marginBottom: 12 }} />
      )}
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold", textAlign: "center" }}>{title}</Text>
      {message ? (
        <Text style={{ color: colors.subText, fontSize: 14, textAlign: "center", marginTop: 6 }}>{message}</Text>
      ) : null}
    </View>
  );
}
