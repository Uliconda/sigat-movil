import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";

/** Cualquier navegador que pueda abrir el menú lateral. */
export interface ConMenu {
  openDrawer?: () => void;
  getParent?: () => ConMenu | undefined;
}

// Busca el menú lateral subiendo por los navegadores padre (pila › pestañas › menú).
function abrirMenu(navigation: ConMenu | undefined) {
  if (!navigation) return;
  if (navigation.openDrawer) navigation.openDrawer();
  else abrirMenu(navigation.getParent?.());
}

export function MenuButton({ navigation, color = "white" }: { navigation: ConMenu; color?: string }) {
  return (
    <TouchableOpacity
      onPress={() => abrirMenu(navigation)}
      style={{ marginLeft: 10, marginRight: 15 }}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
    >
      <Ionicons name="menu" size={30} color={color} />
    </TouchableOpacity>
  );
}
