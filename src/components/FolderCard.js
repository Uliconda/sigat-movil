import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Tarjeta de carpeta (categoría, subcategoría o sección) con su conteo de equipos.
export function FolderCard({ nombre, cantidad, icon, color, borderColor, onPress, onLongPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: borderColor ?? colors.divider }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}, ${cantidad} equipos`}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Text style={styles.categoryIcon}>{icon}</Text>
      </View>
      <Text style={[styles.categoryName, { color: colors.text }]}>{nombre}</Text>
      <Text style={[styles.categoryCount, { color: colors.subText }]}>{cantidad} equipos</Text>
    </TouchableOpacity>
  );
}
