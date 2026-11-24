import { useNavigation } from "@react-navigation/native";
import { useEffect } from "react";
import { type InventarioValue, useInventarioContext } from "../context/InventarioContext";

// Inventario compartido (ver InventarioProvider). Al volver a la pantalla se
// relee lo guardado en el teléfono, para mostrar al instante los cambios hechos
// en otra pantalla (préstamos, altas, ediciones) aunque no haya conexión.
export function useInventario(): InventarioValue {
  const inventario = useInventarioContext();
  const navigation = useNavigation();
  const { recargarLocal } = inventario;

  useEffect(() => navigation.addListener("focus", () => void recargarLocal()), [navigation, recargarLocal]);

  return inventario;
}
