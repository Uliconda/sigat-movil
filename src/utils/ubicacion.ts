// Ubicación (Edificio › Espacio › Departamento / área), filtros del listado y conteos rápidos.
// Funciones puras: las usan las pantallas y las pruebas.
import { CATEGORIA_GENERAL, normalizarCarpeta } from "../constants/categorias";
import { getEstadoInfo } from "../constants/estados";
import type { Edificio, Equipo, FiltroEstado } from "../types";
import { buscarEquipos, sinPlantillas, type ConteoCarpeta } from "./carpetas";

export const SIN_EDIFICIO = "SIN EDIFICIO";
export const SIN_ESPACIO = "SIN ESPACIO";
export const SIN_AREA = "SIN ÁREA";

/** Igual que reclamar_prestamos_vencidos() en Supabase. */
export const HORAS_VENCIMIENTO = 48;
/** Equipo asignado al personal: no vence (misma regla que el servidor). */
export const CATEGORIA_SIN_VENCIMIENTO = "ADMINISTRATIVOS";

const MS_HORA = 60 * 60 * 1000;

/**
 * Mismo criterio que normalizar_ubicacion() en Supabase: mayúsculas, espacios
 * internos colapsados y null si queda vacío. La app guarda el valor ya
 * normalizado para que el servidor no lo reescriba (la cola offline compara
 * los datos exactos para detectar conflictos).
 */
export function normalizarUbicacion(nombre: unknown): string | null {
  const limpio = String(nombre ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  return limpio || null;
}

export interface UbicacionGuardada {
  edificio: string | null;
  espacio: string | null;
  area: string | null;
}

/** Edificio, espacio y área listos para guardar: sin edificio no hay espacio y sin espacio no hay área. */
export function ubicacionParaGuardar(edificio: unknown, espacio: unknown, area?: unknown): UbicacionGuardada {
  const edificioFinal = normalizarUbicacion(edificio);
  const espacioFinal = edificioFinal ? normalizarUbicacion(espacio) : null;
  return { edificio: edificioFinal, espacio: espacioFinal, area: espacioFinal ? normalizarUbicacion(area) : null };
}

type ConUbicacion = Pick<Equipo, "edificio" | "espacio" | "area">;

export const edificioDe = (equipo: ConUbicacion): string => normalizarUbicacion(equipo.edificio) ?? SIN_EDIFICIO;
export const espacioDe = (equipo: ConUbicacion): string =>
  (normalizarUbicacion(equipo.edificio) && normalizarUbicacion(equipo.espacio)) || SIN_ESPACIO;
export const areaDe = (equipo: ConUbicacion): string =>
  ubicacionParaGuardar(equipo.edificio, equipo.espacio, equipo.area).area ?? SIN_AREA;

/** "EDIFICIO A › AULA 3 › CONTABILIDAD", "EDIFICIO A › AULA 3", "EDIFICIO A" o null. */
export function describirUbicacion(equipo: ConUbicacion): string | null {
  const { edificio, espacio, area } = ubicacionParaGuardar(equipo.edificio, equipo.espacio, equipo.area);
  if (!edificio) return null;
  return [edificio, espacio, area].filter(Boolean).join(" › ");
}

const comparar = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });
// Alfabético, con "SIN ..." y GENERAL al final.
const compararOpciones = (a: string, b: string) => {
  const peso = (x: string) => (x === SIN_EDIFICIO || x === SIN_ESPACIO || x === SIN_AREA || x === CATEGORIA_GENERAL ? 1 : 0);
  return peso(a) - peso(b) || comparar(a, b);
};

/** Cuenta equipos por un campo; `incluir` agrega opciones aunque estén en 0. */
export function contarPor(
  equipos: Equipo[],
  clave: (equipo: Equipo) => string,
  incluir: string[] = []
): ConteoCarpeta[] {
  const conteo = new Map<string, number>(incluir.map((nombre) => [nombre, 0]));
  for (const equipo of sinPlantillas(equipos)) {
    const nombre = clave(equipo);
    conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => compararOpciones(a.nombre, b.nombre));
}

/** Edificios del catálogo (aunque estén vacíos) y "SIN EDIFICIO" si hay equipos sin ubicación. */
export const contarPorEdificio = (equipos: Equipo[], edificios: Pick<Edificio, "nombre">[]): ConteoCarpeta[] =>
  contarPor(equipos, edificioDe, edificios.map((e) => e.nombre));

export const categoriaDe = (equipo: Pick<Equipo, "categoria">) => normalizarCarpeta(equipo.categoria);
export const subcategoriaDe = (equipo: Pick<Equipo, "subcategoria">) => normalizarCarpeta(equipo.subcategoria);

// --- Préstamos vencidos y estados ---

/** fecha_prestamo como Date (texto ISO u objeto de Firestore de versiones anteriores). */
export function fechaPrestamo(valor: unknown): Date | null {
  if (!valor) return null;
  let fecha: Date;
  if (typeof valor === "object") {
    const segundos = (valor as { seconds?: number; _seconds?: number }).seconds
      ?? (valor as { _seconds?: number })._seconds;
    if (typeof segundos !== "number") return null;
    fecha = new Date(segundos * 1000);
  } else {
    fecha = new Date(String(valor));
  }
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Vencido = el servidor ya lo marcó "No responde", o sigue "Prestado" después
 * de 48 h (el servidor lo revisa cada hora, así que puede faltar marcarlo).
 */
export function esPrestamoVencido(equipo: Equipo, ahora: number = Date.now()): boolean {
  const info = getEstadoInfo(equipo.estado);
  if (info.isNoResponde) return true;
  if (String(equipo.estado ?? "").trim().toUpperCase() !== "PRESTADO") return false;
  if (categoriaDe(equipo) === CATEGORIA_SIN_VENCIMIENTO) return false;
  const fecha = fechaPrestamo(equipo.fecha_prestamo);
  return Boolean(fecha && ahora - fecha.getTime() >= HORAS_VENCIMIENTO * MS_HORA);
}

export const FILTROS_ESTADO: { clave: FiltroEstado; etiqueta: string }[] = [
  { clave: "disponible", etiqueta: "Disponibles" },
  { clave: "prestado", etiqueta: "Prestados" },
  { clave: "vencido", etiqueta: "Vencidos" },
  { clave: "fuera", etiqueta: "Fuera de servicio" },
];

/** "Prestados" incluye los vencidos: cuenta todo lo que alguien tiene en su poder. */
export function cumpleEstado(equipo: Equipo, filtro: FiltroEstado, ahora: number = Date.now()): boolean {
  const info = getEstadoInfo(equipo.estado);
  switch (filtro) {
    case "disponible":
      return info.isDisponible;
    case "prestado":
      return info.isPrestado || info.isNoResponde;
    case "vencido":
      return esPrestamoVencido(equipo, ahora);
    case "fuera":
      return info.isFueraDeServicio;
    default:
      return true;
  }
}

export function contarPorEstado(equipos: Equipo[], ahora: number = Date.now()): Record<FiltroEstado, number> {
  const conteo: Record<FiltroEstado, number> = { disponible: 0, prestado: 0, vencido: 0, fuera: 0 };
  for (const equipo of sinPlantillas(equipos)) {
    for (const { clave } of FILTROS_ESTADO) {
      if (cumpleEstado(equipo, clave, ahora)) conteo[clave] += 1;
    }
  }
  return conteo;
}

// --- Filtros del listado ---

export interface FiltrosEquipos {
  edificio?: string | null;
  espacio?: string | null;
  area?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  estado?: FiltroEstado | null;
  texto?: string;
}

/** Equipos que cumplen todos los filtros indicados (los vacíos no filtran). */
export function filtrarEquipos(equipos: Equipo[], filtros: FiltrosEquipos, ahora: number = Date.now()): Equipo[] {
  const base = filtros.texto?.trim() ? buscarEquipos(equipos, filtros.texto) : sinPlantillas(equipos);
  return base
    .filter((e) =>
      (!filtros.edificio || edificioDe(e) === filtros.edificio)
      && (!filtros.espacio || espacioDe(e) === filtros.espacio)
      && (!filtros.area || areaDe(e) === filtros.area)
      && (!filtros.categoria || categoriaDe(e) === normalizarCarpeta(filtros.categoria))
      && (!filtros.subcategoria || subcategoriaDe(e) === normalizarCarpeta(filtros.subcategoria))
      && (!filtros.estado || cumpleEstado(e, filtros.estado, ahora))
    )
    .sort((a, b) => comparar(a.id, b.id));
}
