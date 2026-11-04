import { useEffect, useState } from "react";
import { getEquipos } from "../services/supabaseData";
import { buildCategoryTree } from "../utils/carpetas";

// Árbol de carpetas para los selectores de los formularios.
export function useCategoryTree() {
  const [tree, setTree] = useState({});

  useEffect(() => {
    let active = true;
    getEquipos()
      .then((equipos) => {
        if (active) setTree(buildCategoryTree(equipos));
      })
      .catch((error) => console.error("Error al cargar categorías:", error));
    return () => {
      active = false;
    };
  }, []);

  return tree;
}
