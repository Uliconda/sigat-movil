import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Encabezado de cada nivel del inventario: botón "Volver" y, opcionalmente, crear carpeta.
export function LevelHeader({ backLabel, onBack, onCreate }) {
  const { colors } = useTheme();
  return (
    <View style={styles.levelHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button">
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
        <Text style={[styles.backButtonText, { color: colors.text }]}>{backLabel}</Text>
      </TouchableOpacity>
      {onCreate && (
        <TouchableOpacity onPress={onCreate} accessibilityRole="button" accessibilityLabel="Crear carpeta">
          <Ionicons name="create-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
