import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { getCondicionInfo, getEstadoInfo } from "../constants/estados";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Tarjeta de un equipo en las listas del inventario.
export function EquipoCard({ item, onPress }) {
  const { colors } = useTheme();
  const estado = getEstadoInfo(item.estado);
  const condicion = getCondicionInfo(item.condicion_fisica);
  const poseedor = item.alumno_nombre || (estado.isDisponible ? "En almacén" : "Sin asignar");

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.nombre || "Sin nombre"}, ${estado.label}`}
    >
      <View style={[styles.cardIndicator, { backgroundColor: estado.color }]} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre || "Sin nombre"}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.subText }]}>👤 {poseedor}</Text>
        <Text style={[styles.cardStatus, { color: condicion.color }]}>{condicion.label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.subText} />
    </TouchableOpacity>
  );
}
