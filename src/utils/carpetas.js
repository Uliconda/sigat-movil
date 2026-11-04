import { CATEGORIA_GENERAL, normalizarCarpeta } from "../constants/categorias";

// Campo de cada nivel de carpetas en un equipo.
export const CAMPO_CARPETA = {
  categoria: "categoria",
  subcategoria: "subcategoria",
  seccion: "subSubcategoria",
};

// Cuenta equipos reales por carpeta. Las plantillas no suman, pero hacen que la
// carpeta exista aunque esté vacía.
export function contarPorCarpeta(equipos, campo) {
  const conteo = {};
  equipos.forEach((equipo) => {
    const carpeta = normalizarCarpeta(equipo[campo]);
    conteo[carpeta] ??= 0;
    if (!equipo.isTemplate) conteo[carpeta] += 1;
  });
  return Object.entries(conteo)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export const enCarpeta = (campo, nombre) => (equipo) => normalizarCarpeta(equipo[campo]) === nombre;

export const sinPlantillas = (equipos) => equipos.filter((equipo) => !equipo.isTemplate);

// ¿Hay alguna carpeta distinta de "GENERAL"?
export const tieneCarpetasReales = (lista) => lista.some((carpeta) => carpeta.nombre !== CATEGORIA_GENERAL);

// Busca por nombre o ID, sin distinguir mayúsculas. Excluye plantillas.
export function buscarEquipos(equipos, texto) {
  const query = texto.trim().toLowerCase();
  return sinPlantillas(equipos).filter((equipo) =>
    equipo.nombre?.toLowerCase().includes(query) || equipo.id?.toLowerCase().includes(query)
  );
}

// Construye el árbol Categoría > Subcategoría > [Secciones] a partir del inventario
// (incluye las carpetas vacías, que existen como plantillas).
export function buildCategoryTree(equipos) {
  const tree = {};
  equipos.forEach((equipo) => {
    const cat = normalizarCarpeta(equipo.categoria);
    const sub = normalizarCarpeta(equipo.subcategoria);
    const n3 = normalizarCarpeta(equipo.subSubcategoria);
    tree[cat] ??= {};
    tree[cat][sub] ??= new Set();
    tree[cat][sub].add(n3);
  });

  return Object.fromEntries(
    Object.entries(tree).map(([cat, subs]) => [
      cat,
      Object.fromEntries(Object.entries(subs).map(([sub, set]) => [sub, [...set].sort()])),
    ])
  );
}
