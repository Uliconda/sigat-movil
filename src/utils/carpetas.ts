import { CATEGORIA_GENERAL, normalizarCarpeta } from "../constants/categorias";
import type { Carpeta, CategoryTree, Equipo } from "../types";

// Campo de cada nivel de carpetas en un equipo.
export const CAMPO_CARPETA = {
  categoria: "categoria",
  subcategoria: "subcategoria",
  seccion: "subSubcategoria",
} as const;

export type CampoCarpeta = (typeof CAMPO_CARPETA)[keyof typeof CAMPO_CARPETA];

export interface ConteoCarpeta {
  nombre: string;
  cantidad: number;
}

type EquipoParaCarpetas = Pick<Equipo, "id" | "nombre" | "isTemplate" | CampoCarpeta>;

// Cuenta equipos reales por carpeta. `carpetasVacias` agrega carpetas que existen
// aunque no tengan equipos (vienen de la tabla carpetas o de plantillas antiguas).
export function contarPorCarpeta(
  equipos: Partial<EquipoParaCarpetas>[],
  campo: CampoCarpeta,
  carpetasVacias: string[] = []
): ConteoCarpeta[] {
  const conteo: Record<string, number> = {};
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

export const enCarpeta = (campo: CampoCarpeta, nombre: string | null) => (equipo: Partial<EquipoParaCarpetas>) =>
  normalizarCarpeta(equipo[campo]) === nombre;

export const sinPlantillas = <T extends { isTemplate?: boolean }>(equipos: T[]): T[] =>
  equipos.filter((equipo) => !equipo.isTemplate);

// ¿Hay alguna carpeta distinta de "GENERAL"?
export const tieneCarpetasReales = (lista: ConteoCarpeta[]): boolean =>
  lista.some((carpeta) => carpeta.nombre !== CATEGORIA_GENERAL);

// Busca por nombre o ID, sin distinguir mayúsculas. Excluye plantillas.
export function buscarEquipos<T extends Partial<EquipoParaCarpetas>>(equipos: T[], texto: string): T[] {
  const query = texto.trim().toLowerCase();
  return sinPlantillas(equipos).filter((equipo) =>
    equipo.nombre?.toLowerCase().includes(query) || equipo.id?.toLowerCase().includes(query)
  );
}

// Árbol Categoría > Subcategoría > [Secciones] a partir de la tabla carpetas.
export function buildCarpetasTree(carpetas: Carpeta[]): CategoryTree {
  const porId = new Map(carpetas.map((carpeta) => [carpeta.id, carpeta]));
  const tree: CategoryTree = {};
  const nivel = (n: Carpeta["nivel"]) => carpetas.filter((carpeta) => carpeta.nivel === n);
  const padre = (carpeta: Carpeta) => (carpeta.parent_id ? porId.get(carpeta.parent_id) : undefined);

  nivel(1).forEach((cat) => {
    tree[cat.nombre] ??= {};
  });
  nivel(2).forEach((sub) => {
    const cat = padre(sub);
    if (!cat) return;
    tree[cat.nombre] ??= {};
    tree[cat.nombre][sub.nombre] ??= [];
  });
  nivel(3).forEach((sec) => {
    const sub = padre(sec);
    const cat = sub && padre(sub);
    if (!sub || !cat) return;
    tree[cat.nombre] ??= {};
    tree[cat.nombre][sub.nombre] ??= [];
    tree[cat.nombre][sub.nombre].push(sec.nombre);
  });

  Object.values(tree).forEach((subs) => Object.values(subs).forEach((secciones) => secciones.sort()));
  return tree;
}

// Une varios árboles de carpetas sin repetir nombres.
export function mergeTrees(...trees: CategoryTree[]): CategoryTree {
  const result: CategoryTree = {};
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
export function findCarpetaId(carpetas: Carpeta[], ruta: (string | null)[]): string | null {
  let parentId: string | null = null;
  let encontrada: Carpeta | undefined;
  for (const nombre of ruta) {
    const normalizado = normalizarCarpeta(nombre);
    const padreActual: string | null = parentId;
    encontrada = carpetas.find((c) => (c.parent_id ?? null) === padreActual && c.nombre === normalizado);
    if (!encontrada) return null;
    parentId = encontrada.id;
  }
  return encontrada?.id ?? null;
}

// Construye el árbol Categoría > Subcategoría > [Secciones] a partir del inventario.
export function buildCategoryTree(equipos: Partial<EquipoParaCarpetas>[]): CategoryTree {
  const tree: Record<string, Record<string, Set<string>>> = {};
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

// Árbol completo: carpetas del servidor + las que usan los equipos (incluye
// equipos creados sin conexión que aún no se sincronizan).
export function buildInventoryTree(carpetas: Carpeta[], equipos: Partial<EquipoParaCarpetas>[]): CategoryTree {
  return mergeTrees(buildCarpetasTree(carpetas), buildCategoryTree(equipos));
}
