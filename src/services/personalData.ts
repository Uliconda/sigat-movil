import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import type { Asignacion, Personal, PersonalInput } from "../types";
import { isNetworkError, OfflineError } from "./offlineQueue";
import { supabase } from "./supabaseClient";
import { getUserId, readJson, storageKey } from "./supabaseData";

// Personal administrativo: la lista se guarda en el teléfono para poder
// asignar equipo sin conexión. Dar de alta o editar requiere conexión.

const CAMPOS_PERSONAL = "id, nombre, departamento, fecha_ingreso, fecha_termino, conducta, conducta_notas";
const CAMPOS_ASIGNACION =
  "id, personal_id, equipo_id, equipo_nombre, fecha_inicio, fecha_fin, asignado_por, recibido_por, condicion_devolucion, observaciones, origen";
const SIN_CONEXION = "Necesitas conexión para guardar los datos del personal.";
const FALTA_MIGRACION =
  "Falta ejecutar en Supabase la migración 20261106000000_personal_administrativo.sql.";

const codigo = (error: unknown) => (error as { code?: string } | undefined)?.code;
const faltaTabla = (error: unknown) => codigo(error) === "PGRST205" || codigo(error) === "42P01";

async function exigirConexion() {
  const network = await NetInfo.fetch();
  if (network.isConnected === false) throw new OfflineError(SIN_CONEXION);
}

// Lee de Supabase y guarda en caché; sin conexión devuelve la caché.
async function leerConCache<T>(coleccion: string, consulta: () => PromiseLike<{ data: unknown; error: unknown }>, vacio: T): Promise<T> {
  const userId = await getUserId();
  const key = storageKey(userId, coleccion);
  try {
    await exigirConexion();
    const { data, error } = await consulta();
    if (error) throw error;
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return data as T;
  } catch (error) {
    if (faltaTabla(error)) throw new Error(FALTA_MIGRACION);
    if (!isNetworkError(error)) throw error;
    return readJson<T>(key, vacio);
  }
}

export async function getPersonalLocal(): Promise<Personal[]> {
  return readJson<Personal[]>(storageKey(await getUserId(), "personal"), []);
}

export const getPersonal = () =>
  leerConCache<Personal[]>("personal", () => supabase.from("personal_administrativo").select(CAMPOS_PERSONAL).order("nombre"), []);

// Historial de equipos de una persona (más reciente primero).
export const getAsignacionesPersonal = (personalId: string) =>
  leerConCache<Asignacion[]>(
    `asignaciones:${personalId}`,
    () =>
      supabase
        .from("asignaciones_equipo")
        .select(CAMPOS_ASIGNACION)
        .eq("personal_id", personalId)
        .order("fecha_inicio", { ascending: false }),
    []
  );

async function guardar(accion: () => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>): Promise<Personal> {
  await exigirConexion();
  const { data, error } = await accion();
  if (error) {
    if (isNetworkError(error)) throw new Error(SIN_CONEXION);
    if (faltaTabla(error)) throw new Error(FALTA_MIGRACION);
    if (error.code === "42501") throw new Error("Solo un administrador puede dar de alta o editar personal.");
    throw new Error(error.message || "No se pudieron guardar los datos.");
  }
  await getPersonal().catch(() => undefined);
  return data as Personal;
}

export const crearPersonal = (datos: PersonalInput) =>
  guardar(() => supabase.from("personal_administrativo").insert(datos).select(CAMPOS_PERSONAL).single());

export const actualizarPersonal = (id: string, datos: PersonalInput) =>
  guardar(() => supabase.from("personal_administrativo").update(datos).eq("id", id).select(CAMPOS_PERSONAL).single());

// Elimina para siempre a la persona y su historial de asignaciones (en Supabase).
// El servidor lo rechaza si todavía tiene equipo asignado.
export async function eliminarPersonal(id: string): Promise<void> {
  await exigirConexion();
  const { error } = await supabase.rpc("eliminar_personal", { p_id: id });
  if (error) {
    if (isNetworkError(error)) throw new Error("Necesitas conexión para eliminar personal.");
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error("Falta ejecutar en Supabase la migración 20261107000000_eliminar_personal.sql.");
    }
    throw new Error(error.message || "No se pudo eliminar a la persona.");
  }
  await AsyncStorage.removeItem(storageKey(await getUserId(), `asignaciones:${id}`)).catch(() => undefined);
  await getPersonal().catch(() => undefined);
}
