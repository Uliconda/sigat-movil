import { CATEGORIA_GENERAL, normalizarCarpeta } from "../constants/categorias";

// Campo de cada nivel de carpetas en un equipo.
export const CAMPO_CARPETA = {
  categoria: "categoria",
  subcategoria: "subcategoria",
  seccion: "subSubcategoria",
};

// Cuenta equipos reales por carpeta. `carpetasVacias` agrega carpetas que existen
// aunque no tengan equipos (vienen de la tabla carpetas o de plantillas antiguas).
export function contarPorCarpeta(equipos, campo, carpetasVacias = []) {
  const conteo = {};
  carpetasVacias.forEach((nombre) => {
    conteo[normalizarCarpeta(nombre)] ??= 0;
  });
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

// Árbol Categoría > Subcategoría > [Secciones] a partir de la tabla carpetas.
export function buildCarpetasTree(carpetas) {
  const porId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const tree = {};
  const nivel = (n) => carpetas.filter((carpeta) => carpeta.nivel === n);

  nivel(1).forEach((cat) => {
    tree[cat.nombre] ??= {};
  });
  nivel(2).forEach((sub) => {
    const cat = porId.get(sub.parent_id);
    if (!cat) return;
    tree[cat.nombre] ??= {};
    tree[cat.nombre][sub.nombre] ??= [];
  });
  nivel(3).forEach((sec) => {
    const sub = porId.get(sec.parent_id);
    const cat = sub && porId.get(sub.parent_id);
    if (!cat) return;
    tree[cat.nombre] ??= {};
    tree[cat.nombre][sub.nombre] ??= [];
    tree[cat.nombre][sub.nombre].push(sec.nombre);
  });

  Object.values(tree).forEach((subs) => Object.values(subs).forEach((secciones) => secciones.sort()));
  return tree;
}

// Une dos árboles de carpetas sin repetir nombres.
export function mergeTrees(...trees) {
  const result = {};
  trees.forEach((tree) => {
    Object.entries(tree).forEach(([cat, subs]) => {
      result[cat] ??= {};
      Object.entries(subs).forEach(([sub, secciones]) => {
        result[cat][sub] = [...new Set([...(result[cat][sub] ?? []), ...secciones])].sort();
      });
    });
  });
  return result;
}

// Busca el ID de una carpeta por su ruta, p. ej. ["CÓMPUTO", "LAPTOPS"].
export function findCarpetaId(carpetas, ruta) {
  let parentId = null;
  let encontrada = null;
  for (const nombre of ruta) {
    const normalizado = normalizarCarpeta(nombre);
    encontrada = carpetas.find((c) => (c.parent_id ?? null) === parentId && c.nombre === normalizado);
    if (!encontrada) return null;
    parentId = encontrada.id;
  }
  return encontrada?.id ?? null;
}

// Árbol completo: carpetas del servidor + las que usan los equipos (incluye
// equipos creados sin conexión que aún no se sincronizan).
export function buildInventoryTree(carpetas, equipos) {
  return mergeTrees(buildCarpetasTree(carpetas), buildCategoryTree(equipos));
}

// Construye el árbol Categoría > Subcategoría > [Secciones] a partir del inventario.
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
