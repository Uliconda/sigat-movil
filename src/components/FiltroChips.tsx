import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { BRAND } from "../theme/colors";
import { useTheme } from "../theme/useTheme";

export interface OpcionChip {
  valor: string;
  etiqueta?: string;
  cantidad?: number;
}

interface FiltroChipsProps {
  titulo: string;
  opciones: OpcionChip[];
  /** null = "Todos". */
  valor: string | null;
  onCambiar: (valor: string | null) => void;
  etiquetaTodos?: string;
}

// Fila deslizable de filtros: "Todos" + una opción por valor. Tocar la opción
// elegida la quita.
export function FiltroChips({ titulo, opciones, valor, onCambiar, etiquetaTodos = "Todos" }: FiltroChipsProps) {
  const { colors } = useTheme();

  const chip = (clave: string, texto: string, activo: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={clave}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: activo ? BRAND.primary : colors.border,
        backgroundColor: activo ? BRAND.primary : colors.card,
      }}
    >
      <Text style={{ color: activo ? "white" : colors.text, fontSize: 13, fontWeight: activo ? "bold" : "normal" }}>{texto}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.subText, fontSize: 11, fontWeight: "bold", marginBottom: 5, textTransform: "uppercase" }}>
        {titulo}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {chip("__todos", etiquetaTodos, valor === null, () => onCambiar(null))}
        {opciones.map((o) => {
          const texto = o.cantidad === undefined ? (o.etiqueta ?? o.valor) : `${o.etiqueta ?? o.valor} (${o.cantidad})`;
          return chip(o.valor, texto, valor === o.valor, () => onCambiar(valor === o.valor ? null : o.valor));
        })}
      </ScrollView>
    </View>
  );
}
