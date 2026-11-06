import { BRAND } from "../theme/colors";
import { CATEGORIA_GENERAL } from "../constants/categorias";
import type { Carpeta, Conducta, Equipo, Personal, PersonalInput } from "../types";
import { buildInventoryTree, normalizarTexto } from "./carpetas";

export const CATEGORIA_ADMINISTRATIVOS = "ADMINISTRATIVOS";

// Conducta respecto al uso del equipo (mismos valores que la restricción en Supabase).
export const CONDUCTAS: readonly { value: Conducta; color: string; descripcion: string }[] = [
  { value: "Excelente", color: BRAND.success, descripcion: "Cuida el equipo y lo entrega a tiempo" },
  { value: "Buena", color: "#2E7D32", descripcion: "Uso adecuado, sin incidentes relevantes" },
  { value: "Regular", color: BRAND.warning, descripcion: "Algunos descuidos o retrasos" },
  { value: "Mala", color: BRAND.danger, descripcion: "Daños, pérdidas o mal uso del equipo" },
];

export const colorConducta = (conducta?: string | null): string =>
  CONDUCTAS.find((c) => c.value === conducta)?.color ?? BRAND.neutral;

// Departamentos válidos: las subcategorías de la categoría ADMINISTRATIVOS
// (carpetas del servidor + las que ya usan los equipos), sin "GENERAL".
export function departamentosAdministrativos(carpetas: Carpeta[], equipos: Partial<Equipo>[]): string[] {
  const subcategorias = buildInventoryTree(carpetas, equipos)[CATEGORIA_ADMINISTRATIVOS] ?? {};
  return Object.keys(subcategorias)
    .filter((nombre) => nombre !== CATEGORIA_GENERAL)
    .sort((a, b) => a.localeCompare(b, "es"));
}

export const esAdministrativo = (equipo: Pick<Equipo, "categoria">): boolean =>
  String(equipo.categoria ?? "").trim().toUpperCase() === CATEGORIA_ADMINISTRATIVOS;

// Fecha local de hoy en formato AAAA-MM-DD.
export function hoyISO(ahora = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// Sigue laborando si no tiene fecha de término o si es hoy o posterior.
export const estaActivo = (persona: Pick<Personal, "fecha_termino">, hoy = hoyISO()): boolean =>
  !persona.fecha_termino || persona.fecha_termino >= hoy;

// "2026-03-15" → "15/03/2026".
export function formatearFecha(iso?: string | null): string {
  if (!iso) return "";
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : iso;
}

// Fecha y hora legibles de un timestamp ISO.
export function formatearFechaHora(iso?: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const hora = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
  return `${formatearFecha(hoyISO(fecha))} ${hora}`;
}

/**
 * Convierte lo que escribe el usuario ("15/03/2026", "15-3-2026") a "2026-03-15".
 * Vacío → null. Fecha inexistente → undefined.
 */
export function leerFecha(texto: string): string | null | undefined {
  const limpio = texto.trim();
  if (!limpio) return null;
  const partes = limpio.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!partes) return undefined;
  const [, dia, mes, anio] = partes.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return undefined;
  return hoyISO(fecha);
}

export interface FormularioPersonal {
  nombre: string;
  departamento: string;
  fechaIngreso: string;
  fechaTermino: string;
  conducta: Conducta | null;
  conductaNotas: string;
}

export const formularioDesde = (persona?: Personal | null): FormularioPersonal => ({
  nombre: persona?.nombre ?? "",
  departamento: persona?.departamento ?? "",
  fechaIngreso: formatearFecha(persona?.fecha_ingreso),
  fechaTermino: formatearFecha(persona?.fecha_termino),
  conducta: persona?.conducta ?? null,
  conductaNotas: persona?.conducta_notas ?? "",
});

// Valida el formulario y lo convierte a los campos de la tabla.
export function validarFormulario(form: FormularioPersonal): { ok: true; datos: PersonalInput } | { ok: false; error: string } {
  const nombre = form.nombre.trim().replace(/\s+/g, " ");
  if (!nombre) return { ok: false, error: "Escribe el nombre de la persona." };

  const ingreso = leerFecha(form.fechaIngreso);
  if (ingreso === undefined) return { ok: false, error: "La fecha de ingreso debe tener el formato DD/MM/AAAA." };
  const termino = leerFecha(form.fechaTermino);
  if (termino === undefined) return { ok: false, error: "La fecha de término debe tener el formato DD/MM/AAAA." };
  if (ingreso && termino && termino < ingreso) {
    return { ok: false, error: "La fecha de término no puede ser anterior a la de ingreso." };
  }

  return {
    ok: true,
    datos: {
      nombre,
      departamento: form.departamento.trim() || null,
      fecha_ingreso: ingreso,
      fecha_termino: termino,
      conducta: form.conducta,
      conducta_notas: form.conductaNotas.trim() || null,
    },
  };
}

// Busca por nombre o departamento, sin distinguir mayúsculas ni acentos.
// Todas las palabras deben coincidir. Ordena alfabéticamente.
export function buscarPersonal<T extends Pick<Personal, "nombre" | "departamento">>(lista: T[], texto: string): T[] {
  const palabras = normalizarTexto(texto).split(/\s+/).filter(Boolean);
  return lista
    .filter((persona) => {
      const contenido = normalizarTexto(`${persona.nombre} ${persona.departamento ?? ""}`);
      return palabras.every((palabra) => contenido.includes(palabra));
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

// Equipos que la persona tiene ahora (según el inventario, también sin conexión).
export const equiposDePersona = (equipos: Equipo[], personalId: string): Equipo[] =>
  equipos.filter((equipo) => equipo.personal_id === personalId);
