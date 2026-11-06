import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import type {
  Carpeta,
  ConflictResolution,
  Equipo,
  EquipoData,
  EquipoRow,
  HistorialEntry,
  NewQueueOperation,
  Perfil,
  QueueOperation,
  SyncStatus,
} from "../types";
import {
  applyQueue,
  isNetworkError,
  newId,
  nextLocalEquipoId,
  OfflineError,
  sameData,
  summarizeQueue,
  withoutLocalId,
} from "./offlineQueue";
import { supabase } from "./supabaseClient";

type SyncListener = (status: SyncStatus) => void;
type SyncResult = { result: "synced"; serverData?: undefined } | { result: "conflict"; serverData: Equipo | null };

/** Error de PostgREST/Supabase (código de PostgreSQL o de PostgREST). */
interface DbError {
  code?: string;
  message?: string;
}

const STORAGE_PREFIX = "sigat-offline-v1";
const listeners = new Set<SyncListener>();
let syncInProgress = false;
let syncRequested = false;
let queueMutation: Promise<unknown> = Promise.resolve();
let syncStatus: SyncStatus = { online: true, pending: 0, conflicts: 0, conflictItems: [], error: null };

const errorMessage = (error: unknown) => (error as DbError | undefined)?.message;
const errorCode = (error: unknown) => (error as DbError | undefined)?.code;

function notifyStatus() {
  listeners.forEach((listener) => listener(syncStatus));
}

function scheduleSync(userId: string) {
  void syncPendingChanges(userId).catch((error: unknown) => {
    console.error("No se pudo iniciar la sincronización offline:", error);
    syncStatus = {
      ...syncStatus,
      error: errorMessage(error) || "No se pudo iniciar la sincronización.",
    };
    notifyStatus();
  });
}

export async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user?.id) {
    throw new Error("Inicia sesión para consultar o guardar datos.");
  }
  return data.session.user.id;
}

export function storageKey(userId: string, collection: string) {
  return `${STORAGE_PREFIX}:${userId}:${collection}`;
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

async function readCache(userId: string): Promise<Equipo[]> {
  return readJson<Equipo[]>(storageKey(userId, "equipos"), []);
}

async function writeCache(userId: string, equipos: Equipo[]) {
  await AsyncStorage.setItem(storageKey(userId, "equipos"), JSON.stringify(equipos));
}

async function readQueue(userId: string): Promise<QueueOperation[]> {
  return readJson<QueueOperation[]>(storageKey(userId, "queue"), []);
}

async function writeQueue(userId: string, queue: QueueOperation[]) {
  await AsyncStorage.setItem(storageKey(userId, "queue"), JSON.stringify(queue));
  syncStatus = {
    ...syncStatus,
    ...summarizeQueue(queue),
    error: queue.find((item) => item.error)?.error ?? null,
  };
  notifyStatus();
}

// Ejecuta las modificaciones de la cola una por una, en orden.
function serializeQueueMutation<T>(action: () => Promise<T>): Promise<T> {
  const mutation = queueMutation.then(action);
  queueMutation = mutation.catch(() => {});
  return mutation;
}

async function mutateQueue(
  userId: string,
  update: (queue: QueueOperation[]) => QueueOperation[] | Promise<QueueOperation[]>
) {
  return serializeQueueMutation(async () => {
    const queue = await readQueue(userId);
    const updatedQueue = await update(queue);
    await writeQueue(userId, updatedQueue);
    return updatedQueue;
  });
}

const toEquipo = (row: EquipoRow): Equipo => ({ ...row.data, id: row.id });

async function readRemoteEquipos(userId: string): Promise<Equipo[]> {
  const { data, error } = await supabase.from("equipos").select("id, data");
  if (error) throw error;
  const equipos = (data as EquipoRow[]).map(toEquipo);
  await writeCache(userId, equipos);
  return equipos;
}

export async function getEquipos(): Promise<Equipo[]> {
  const userId = await getUserId();
  const queue = await readQueue(userId);
  let equipos: Equipo[];

  try {
    const network = await NetInfo.fetch();
    if (network.isConnected === false) throw new OfflineError();
    equipos = await readRemoteEquipos(userId);
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    equipos = await readCache(userId);
  }

  return applyQueue(equipos, queue);
}

// Inventario desde el teléfono (caché + cambios pendientes), sin usar la red.
export async function getEquiposLocal(): Promise<Equipo[]> {
  const userId = await getUserId();
  return applyQueue(await readCache(userId), await readQueue(userId));
}

// Consulta un solo equipo en Supabase en lugar de descargar todo el inventario.
// Sin conexión usa la caché local. En ambos casos aplica los cambios pendientes.
export async function getEquipo(id: string): Promise<Equipo | null> {
  const userId = await getUserId();
  const pending = (await readQueue(userId)).filter((operation) => operation.equipoId === id);
  let base: Equipo[];

  try {
    const network = await NetInfo.fetch();
    if (network.isConnected === false) throw new OfflineError();
    const remote = await getRemoteEquipo(id);
    base = remote ? [remote] : [];
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    base = (await readCache(userId)).filter((equipo) => equipo.id === id);
  }

  return applyQueue(base, pending).find((equipo) => equipo.id === id) ?? null;
}

// Aplica un evento de Supabase Realtime a la caché local y devuelve el equipo
// resultante (con cambios pendientes aplicados) o null si fue eliminado.
export async function applyRemoteChange(
  eventType: "INSERT" | "UPDATE" | "DELETE",
  row: Partial<EquipoRow> | null | undefined
): Promise<{ id: string | null; equipo: Equipo | null }> {
  const id = row?.id;
  if (!id) return { id: null, equipo: null };

  return serializeQueueMutation(async () => {
    const userId = await getUserId();
    const cache = (await readCache(userId)).filter((equipo) => equipo.id !== id);
    if (eventType !== "DELETE" && row.data) cache.push({ ...row.data, id });
    await writeCache(userId, cache);

    const pending = (await readQueue(userId)).filter((operation) => operation.equipoId === id);
    const equipo = applyQueue(cache.filter((item) => item.id === id), pending)
      .find((item) => item.id === id) ?? null;
    return { id, equipo };
  });
}

// Reserva el siguiente ID "EQ-XXX" en Supabase (función next_equipo_id), así dos
// teléfonos nunca reciben el mismo número. Sin conexión calcula un ID local y lo
// marca como provisional: si choca con otro, la sincronización lo reporta como conflicto.
export async function getNextEquipoId(): Promise<{ id: string; provisional: boolean }> {
  try {
    const network = await NetInfo.fetch();
    if (network.isConnected === false) throw new OfflineError();
    const { data, error } = await supabase.rpc("next_equipo_id");
    if (error) throw error;
    return { id: data as string, provisional: false };
  } catch (error) {
    if (isNetworkError(error)) {
      return { id: nextLocalEquipoId(await getEquiposLocal()), provisional: true };
    }
    // La función aún no existe en la base: se usa el inventario remoto actualizado.
    if (errorCode(error) === "PGRST202" || errorCode(error) === "42883") {
      console.warn("Falta la función next_equipo_id en Supabase; se calcula el ID localmente.");
      return { id: nextLocalEquipoId(await getEquipos()), provisional: false };
    }
    throw error;
  }
}

// ==========================================
// CARPETAS (Categoría > Subcategoría > Sección)
// ==========================================

// La tabla aún no existe en la base (falta ejecutar el SQL actualizado).
const isMissingTable = (error: unknown) => errorCode(error) === "PGRST205" || errorCode(error) === "42P01";

export async function getCarpetasLocal(): Promise<Carpeta[]> {
  const userId = await getUserId();
  return readJson<Carpeta[]>(storageKey(userId, "carpetas"), []);
}

// Carpetas desde Supabase (con respaldo en caché si no hay conexión).
export async function getCarpetas(): Promise<Carpeta[]> {
  const userId = await getUserId();
  try {
    const network = await NetInfo.fetch();
    if (network.isConnected === false) throw new OfflineError();
    const { data, error } = await supabase.from("carpetas").select("id, parent_id, nombre, nivel");
    if (error) throw error;
    await AsyncStorage.setItem(storageKey(userId, "carpetas"), JSON.stringify(data));
    return data as Carpeta[];
  } catch (error) {
    if (isMissingTable(error)) {
      console.warn("Falta la tabla carpetas en Supabase; se usan solo las carpetas de los equipos.");
      return [];
    }
    if (!isNetworkError(error)) throw error;
    return getCarpetasLocal();
  }
}

const SIN_CONEXION_CARPETAS = "Necesitas conexión para administrar carpetas.";

// Crear, renombrar y eliminar carpetas cambian muchos equipos a la vez en el
// servidor, así que requieren conexión.
async function carpetaRpc<T>(nombreFuncion: string, params: Record<string, unknown>): Promise<T> {
  const network = await NetInfo.fetch();
  if (network.isConnected === false) throw new Error(SIN_CONEXION_CARPETAS);
  const { data, error } = await supabase.rpc(nombreFuncion, params);
  if (error) {
    if (isNetworkError(error)) throw new Error(SIN_CONEXION_CARPETAS);
    throw new Error(error.message || "No se pudo actualizar la carpeta.");
  }
  await getCarpetas();
  return data as T;
}

export const crearCarpeta = (parentId: string | null, nombre: string) =>
  carpetaRpc<string>("crear_carpeta", { p_parent_id: parentId, p_nombre: nombre });

export const renombrarCarpeta = (id: string, nombre: string) =>
  carpetaRpc<void>("renombrar_carpeta", { p_id: id, p_nombre: nombre });

export const eliminarCarpeta = (id: string) => carpetaRpc<void>("eliminar_carpeta", { p_id: id });

// ==========================================
// COLA DE CAMBIOS SIN CONEXIÓN
// ==========================================

type OperationFactory = (userId: string) => Promise<NewQueueOperation>;

async function enqueue(operation: NewQueueOperation | OperationFactory): Promise<void> {
  return serializeQueueMutation(async () => {
    const userId = await getUserId();
    const queue = await readQueue(userId);
    const operationData = typeof operation === "function" ? await operation(userId) : operation;
    const queuedOperation = {
      ...operationData,
      id: newId(),
      createdAt: new Date().toISOString(),
      status: "pending",
    } as QueueOperation;
    queue.push(queuedOperation);

    if (queuedOperation.equipoId) {
      const cache = await readCache(userId);
      await writeCache(userId, applyQueue(cache, queue));
    }
    await writeQueue(userId, queue);
    scheduleSync(userId);
  });
}

export async function updateEquipo(
  id: string,
  changes: Partial<EquipoData>,
  history: HistorialEntry | null = null
): Promise<void> {
  await enqueue(async (userId) => {
    const cache = applyQueue(await readCache(userId), await readQueue(userId));
    let current = cache.find((equipo) => equipo.id === id) ?? null;
    if (!current) current = await getEquipo(id);
    if (!current) throw new Error(`No se encontró el equipo ${id} en el inventario local.`);
    return {
      type: "update",
      equipoId: id,
      expectedData: current,
      changes,
      history: history ? { ...history, id: newId() } : null,
    };
  });
}

export async function saveEquipo(id: string, equipo: EquipoData): Promise<void> {
  await enqueue(async (userId) => {
    const local = applyQueue(await readCache(userId), await readQueue(userId));
    if (local.some((item) => item.id === id)) {
      throw new Error(`Ya existe un equipo con el ID ${id}.`);
    }
    return { type: "create", equipoId: id, data: equipo };
  });
}

export async function createEquipo(equipo: EquipoData): Promise<string> {
  const id = newId();
  await saveEquipo(id, equipo);
  return id;
}

export async function deleteEquipo(id: string): Promise<void> {
  await enqueue(async (userId) => {
    const queue = await readQueue(userId);
    const equipos = applyQueue(await readCache(userId), queue);
    const equipo = equipos.find((item) => item.id === id);
    if (!equipo) throw new Error(`No se encontró el equipo ${id} en el inventario local.`);
    return { type: "delete", equipoId: id, expectedData: equipo };
  });
}

export async function addHistorial(entry: HistorialEntry): Promise<void> {
  const date = entry.fecha ? new Date(entry.fecha) : null;
  if (date && Number.isNaN(date.getTime())) {
    throw new Error("La fecha del movimiento no es válida.");
  }
  await enqueue({
    type: "history",
    entry: { ...entry, id: newId(), fecha: date?.toISOString() ?? null },
  });
}

async function readRemoteRow(id: string): Promise<EquipoRow | null> {
  const { data, error } = await supabase.from("equipos").select("id, data").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as EquipoRow | null;
}

async function getRemoteEquipo(id: string): Promise<Equipo | null> {
  const row = await readRemoteRow(id);
  return row ? toEquipo(row) : null;
}

async function syncOperation(operation: QueueOperation): Promise<SyncResult> {
  switch (operation.type) {
    case "update": {
      const row = await readRemoteRow(operation.equipoId);
      const serverData = row?.data ?? null;
      const expectedData = withoutLocalId(operation.expectedData);
      const resultingData = { ...expectedData, ...operation.changes };
      if (row && serverData && !sameData(serverData, expectedData) && !sameData(serverData, resultingData)) {
        return { result: "conflict", serverData: toEquipo(row) };
      }

      if (serverData && sameData(serverData, expectedData)) {
        const { data: applied, error } = await supabase.rpc("update_equipo_if_unchanged", {
          p_id: operation.equipoId,
          p_expected_data: expectedData,
          p_changes: operation.changes,
        });
        if (error) throw error;
        if (applied !== true) {
          return { result: "conflict", serverData: await getRemoteEquipo(operation.equipoId) };
        }
      } else if (!serverData) {
        return { result: "conflict", serverData: null };
      }

      if (operation.history) await insertHistory(operation.history);
      return { result: "synced" };
    }

    case "create": {
      const row = await readRemoteRow(operation.equipoId);
      if (row) {
        return sameData(row.data, operation.data)
          ? { result: "synced" }
          : { result: "conflict", serverData: toEquipo(row) };
      }
      const { error } = await supabase.from("equipos").insert({ id: operation.equipoId, data: operation.data });
      if (error) {
        if (error.code === "23505") {
          return { result: "conflict", serverData: await getRemoteEquipo(operation.equipoId) };
        }
        throw error;
      }
      return { result: "synced" };
    }

    case "delete": {
      const { data: deleted, error } = await supabase.rpc("delete_equipo_if_unchanged", {
        p_id: operation.equipoId,
        p_expected_data: withoutLocalId(operation.expectedData),
      });
      if (error) throw error;
      if (deleted === true) return { result: "synced" };
      return { result: "conflict", serverData: await getRemoteEquipo(operation.equipoId) };
    }

    case "history":
      await insertHistory(operation.entry);
      return { result: "synced" };

    default: {
      const desconocida: never = operation;
      throw new Error(`Tipo de operación offline desconocido: ${(desconocida as QueueOperation).type}`);
    }
  }
}

async function insertHistory(entry: HistorialEntry) {
  const date = entry.fecha ? new Date(entry.fecha) : null;
  const { error } = await supabase.from("historial").insert({
    id: entry.id,
    data: entry,
    fecha: date?.toISOString() ?? null,
  });
  if (error && error.code !== "23505") throw error;
}

export async function syncPendingChanges(userIdOverride?: string, forceRetry = false): Promise<void> {
  if (syncInProgress) {
    syncRequested = true;
    return;
  }
  const activeUserId = await getUserId();
  const userId = userIdOverride ?? activeUserId;
  if (activeUserId !== userId) return;
  const network = await NetInfo.fetch();
  if (syncInProgress) {
    syncRequested = true;
    return;
  }
  syncInProgress = true;
  if (network.isConnected === false) {
    syncStatus = { ...syncStatus, online: false };
    notifyStatus();
    syncInProgress = false;
    if (syncRequested) {
      syncRequested = false;
      scheduleSync(userId);
    }
    return;
  }

  syncStatus = { ...syncStatus, online: true, error: null };
  notifyStatus();

  try {
    const queue = await readQueue(userId);
    const processedIds = new Set(queue.map((operation) => operation.id));
    const remaining: QueueOperation[] = [];
    let blocked = false;
    for (const operation of queue) {
      if (blocked) {
        remaining.push(operation);
        continue;
      }
      if (operation.status === "conflict") {
        remaining.push(operation);
        blocked = true;
        continue;
      }
      if (operation.error && !forceRetry) {
        remaining.push(operation);
        blocked = true;
        continue;
      }
      try {
        if (await getUserId() !== userId) {
          remaining.push(operation, ...queue.slice(queue.indexOf(operation) + 1));
          blocked = true;
          continue;
        }
        const { error: _previousError, ...retryOperation } = { ...operation, status: "pending" as const };
        const { result, serverData } = await syncOperation(retryOperation as QueueOperation);
        if (result === "conflict") {
          remaining.push({
            ...operation,
            status: "conflict",
            serverData,
            error: "El registro cambió en otro dispositivo.",
          });
          blocked = true;
        }
      } catch (error) {
        if (isNetworkError(error)) {
          remaining.push(operation);
          remaining.push(...queue.slice(queue.indexOf(operation) + 1));
          syncStatus = { ...syncStatus, online: false, error: null };
          break;
        }
        console.error("No se pudo sincronizar un cambio pendiente:", error);
        remaining.push({ ...operation, error: errorMessage(error) || "Error al sincronizar." });
        blocked = true;
      }
    }
    const currentQueue = await mutateQueue(userId, (current) => [
      ...remaining,
      ...current.filter((operation) => !processedIds.has(operation.id)),
    ]);
    if (currentQueue.length === 0) {
      try {
        await readRemoteEquipos(userId);
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        syncStatus = { ...syncStatus, online: false };
        notifyStatus();
      }
    }
  } finally {
    syncInProgress = false;
    if (syncRequested) {
      syncRequested = false;
      scheduleSync(userId);
    }
  }
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(syncStatus);
  return () => {
    listeners.delete(listener);
  };
}

export async function getSyncStatus(userId: string): Promise<SyncStatus> {
  const queue = await readQueue(userId);
  return { ...syncStatus, ...summarizeQueue(queue) };
}

export async function resolveOfflineConflict(
  userId: string,
  operationId: string,
  resolution: ConflictResolution
): Promise<void> {
  if (await getUserId() !== userId) {
    throw new Error("La cuenta activa cambió. Inicia sesión con la cuenta original para resolver este conflicto.");
  }
  const queue = await readQueue(userId);
  const operation = queue.find((item) => item.id === operationId);
  if (!operation || operation.status !== "conflict") return;

  if (resolution === "keep-local") {
    const serverData = operation.serverData;
    if (operation.type === "create" || !serverData) {
      throw new Error("Este conflicto no se puede aplicar automáticamente. Conserva el registro local y consulta con un administrador.");
    }
    await mutateQueue(userId, (current) => current.map((item) => {
      if (item.id !== operationId) return item;
      const { serverData: _server, error: _error, ...rest } = item;
      return { ...rest, expectedData: serverData, status: "pending" } as QueueOperation;
    }));
    scheduleSync(userId);
    return;
  }

  if (resolution === "keep-server") {
    await mutateQueue(userId, (current) => current.filter((item) => item.equipoId !== operation.equipoId));
    const cache = await readCache(userId);
    const updated = cache.filter((equipo) => equipo.id !== operation.equipoId);
    if (operation.serverData) updated.push(operation.serverData);
    await writeCache(userId, updated);
    return;
  }

  throw new Error("Resolución de conflicto desconocida.");
}

export function startSyncMonitor(userId: string): () => void {
  const unsubscribeNetwork = NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false;
    syncStatus = { ...syncStatus, online };
    notifyStatus();
    if (online) scheduleSync(userId);
  });
  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") scheduleSync(userId);
  });
  const retryTimer = setInterval(() => {
    if (AppState.currentState === "active") scheduleSync(userId);
  }, 30000);
  void getSyncStatus(userId).then((status) => {
    syncStatus = status;
    notifyStatus();
    scheduleSync(userId);
  }).catch((error: unknown) => {
    console.error("No se pudo iniciar la sincronización offline:", error);
  });

  return () => {
    unsubscribeNetwork();
    appStateSubscription.remove();
    clearInterval(retryTimer);
  };
}

export async function getProfile(id: string): Promise<Perfil | null> {
  const cacheKey = storageKey(id, "profile");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, nombre, rol, must_change_password")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    return data as Perfil | null;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const cachedProfile = await readJson<Perfil | null>(cacheKey, null);
    if (cachedProfile) return cachedProfile;
    throw error;
  }
}
