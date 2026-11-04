import { useEffect, useState } from "react";
import { getCarpetas, getEquipos } from "../services/supabaseData";
import type { CategoryTree } from "../types";
import { buildInventoryTree } from "../utils/carpetas";

// Árbol de carpetas para los selectores de los formularios.
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryTree>({});

  useEffect(() => {
    let active = true;
    Promise.all([getCarpetas(), getEquipos()])
      .then(([carpetas, equipos]) => {
        if (active) setTree(buildInventoryTree(carpetas, equipos));
      })
      .catch((error) => console.error("Error al cargar categorías:", error));
    return () => {
      active = false;
    };
  }, []);

  return tree;
}
