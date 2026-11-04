// Lógica pura (sin red ni almacenamiento) de la cola de cambios sin conexión.
// Se mantiene aparte para poder probarla con pruebas unitarias.

export function newId() {
  return `MOB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Ordena las llaves de forma recursiva para comparar objetos sin importar el orden.
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

export function sameData(first, second) {
  return JSON.stringify(canonical(first)) === JSON.stringify(canonical(second));
}

// El teléfono reporta que no hay conexión (antes de intentar llamar a Supabase).
export class OfflineError extends Error {
  constructor(message = "Sin conexión a internet.") {
    super(message);
    this.name = "OfflineError";
    this.offline = true;
  }
}

export function isNetworkError(error) {
  if (error?.offline === true) return true;
  const message = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return message.includes("network")
    || message.includes("fetch")
    || message.includes("timeout")
    || message.includes("timed out")
    || error?.status >= 500;
}

// Aplica las operaciones pendientes (en orden) sobre una lista de equipos.
export function applyQueue(equipos, queue) {
  const result = new Map(equipos.map((equipo) => [equipo.id, equipo]));
  queue.forEach((operation) => {
    if (operation.type === "create") {
      result.set(operation.equipoId, { ...operation.data, id: operation.equipoId });
    } else if (operation.type === "update") {
      const current = result.get(operation.equipoId);
      if (current) result.set(operation.equipoId, { ...current, ...operation.changes });
    } else if (operation.type === "delete") {
      result.delete(operation.equipoId);
    }
  });
  return [...result.values()];
}

export function summarizeQueue(queue) {
  const conflicts = queue.filter((item) => item.status === "conflict");
  return {
    pending: queue.length,
    conflicts: conflicts.length,
    conflictItems: conflicts.map(({ id, equipoId, type, error }) => ({ id, equipoId, type, error })),
  };
}

export function withoutLocalId(equipo) {
  const { id, ...data } = equipo;
  return data;
}

export function formatEquipoId(number) {
  return `EQ-${String(number).padStart(3, "0")}`;
}

// Siguiente "EQ-XXX" a partir de los equipos conocidos (respaldo sin conexión).
export function nextLocalEquipoId(equipos) {
  const maxNum = equipos.reduce((max, equipo) => {
    const match = /^EQ-(\d+)$/.exec(equipo.id ?? "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return formatEquipoId(maxNum + 1);
}
