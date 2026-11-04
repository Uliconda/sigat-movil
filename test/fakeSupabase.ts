// Supabase en memoria para pruebas: imita las tablas equipos/historial/carpetas
// y los RPC que usa la app (update/delete_equipo_if_unchanged, next_equipo_id,
// crear_carpeta).
import { sameData } from "../src/services/offlineQueue";
import type { Carpeta, EquipoData } from "../src/types";

type Row = Record<string, unknown>;
type Result<T> = { data: T; error: { code?: string; message: string } | null };

export interface FakeDb {
  online: boolean;
  equipos: Map<string, EquipoData>;
  historial: Row[];
  carpetas: Carpeta[];
  nextEquipoNumber: number;
}

const clone = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

export function createFakeDb(): FakeDb {
  return { online: true, equipos: new Map(), historial: [], carpetas: [], nextEquipoNumber: 1 };
}

export function createFakeSupabase(db: FakeDb) {
  const rowsOf = (table: string): Row[] => {
    if (table === "equipos") return [...db.equipos.entries()].map(([id, data]) => ({ id, data }));
    if (table === "carpetas") return db.carpetas as unknown as Row[];
    return db.historial;
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user-1" } } }, error: null }),
    },

    from(table: string) {
      return {
        select() {
          const result: Result<Row[]> = { data: clone(rowsOf(table)), error: null };
          return {
            eq(column: string, value: unknown) {
              return {
                maybeSingle: async (): Promise<Result<Row | null>> => ({
                  data: clone(rowsOf(table).find((row) => row[column] === value) ?? null),
                  error: null,
                }),
              };
            },
            then<T>(resolve: (value: Result<Row[]>) => T, reject?: (reason: unknown) => T) {
              return Promise.resolve(result).then(resolve, reject);
            },
          };
        },

        async insert(row: Row) {
          const id = row.id as string;
          if (table === "equipos") {
            if (db.equipos.has(id)) return { error: { code: "23505", message: "duplicate key" } };
            db.equipos.set(id, clone(row.data as EquipoData));
            return { error: null };
          }
          if (db.historial.some((entry) => entry.id === id)) {
            return { error: { code: "23505", message: "duplicate key" } };
          }
          db.historial.push(clone(row));
          return { error: null };
        },
      };
    },

    async rpc(name: string, args: Record<string, unknown> = {}): Promise<Result<unknown>> {
      const id = args.p_id as string;
      if (name === "update_equipo_if_unchanged") {
        const current = db.equipos.get(id);
        if (!current || !sameData(current, args.p_expected_data)) return { data: false, error: null };
        db.equipos.set(id, { ...current, ...clone(args.p_changes as EquipoData) });
        return { data: true, error: null };
      }
      if (name === "delete_equipo_if_unchanged") {
        const current = db.equipos.get(id);
        if (!current || !sameData(current, args.p_expected_data)) return { data: false, error: null };
        db.equipos.delete(id);
        return { data: true, error: null };
      }
      if (name === "crear_carpeta") {
        const nombre = String(args.p_nombre).trim().toUpperCase();
        const parentId = (args.p_parent_id as string | null) ?? null;
        const padre = db.carpetas.find((c) => c.id === parentId);
        if (db.carpetas.some((c) => c.parent_id === parentId && c.nombre === nombre)) {
          return { data: null, error: { code: "23505", message: `Ya existe una carpeta "${nombre}" en este nivel.` } };
        }
        const nuevoId = `c-${db.carpetas.length + 1}`;
        const nivel = (padre ? padre.nivel + 1 : 1) as Carpeta["nivel"];
        db.carpetas.push({ id: nuevoId, parent_id: parentId, nombre, nivel });
        return { data: nuevoId, error: null };
      }
      if (name === "next_equipo_id") {
        return { data: `EQ-${String(db.nextEquipoNumber++).padStart(3, "0")}`, error: null };
      }
      return { data: null, error: { code: "PGRST202", message: `Función ${name} no encontrada` } };
    },
  };
}
