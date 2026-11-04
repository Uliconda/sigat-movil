// Supabase en memoria para pruebas: imita las tablas equipos/historial y los RPC
// que usa la sincronización (update/delete_equipo_if_unchanged, next_equipo_id).
const { sameData } = require("../src/services/offlineQueue");

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function createFakeDb() {
  return { online: true, equipos: new Map(), historial: [], nextEquipoNumber: 1 };
}

function createFakeSupabase(db) {
  const rowsOf = (table) =>
    table === "equipos"
      ? [...db.equipos.entries()].map(([id, data]) => ({ id, data }))
      : db.historial;

  return {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user-1" } } }, error: null }),
    },

    from(table) {
      return {
        select() {
          const result = { data: clone(rowsOf(table)), error: null };
          return {
            eq(column, value) {
              return {
                maybeSingle: async () => ({
                  data: clone(rowsOf(table).find((row) => row[column] === value) ?? null),
                  error: null,
                }),
              };
            },
            then(resolve, reject) {
              return Promise.resolve(result).then(resolve, reject);
            },
          };
        },

        async insert(row) {
          if (table === "equipos") {
            if (db.equipos.has(row.id)) return { error: { code: "23505", message: "duplicate key" } };
            db.equipos.set(row.id, clone(row.data));
            return { error: null };
          }
          if (db.historial.some((entry) => entry.id === row.id)) {
            return { error: { code: "23505", message: "duplicate key" } };
          }
          db.historial.push(clone(row));
          return { error: null };
        },
      };
    },

    async rpc(name, args) {
      if (name === "update_equipo_if_unchanged") {
        const current = db.equipos.get(args.p_id);
        if (!current || !sameData(current, args.p_expected_data)) return { data: false, error: null };
        db.equipos.set(args.p_id, { ...current, ...clone(args.p_changes) });
        return { data: true, error: null };
      }
      if (name === "delete_equipo_if_unchanged") {
        const current = db.equipos.get(args.p_id);
        if (!current || !sameData(current, args.p_expected_data)) return { data: false, error: null };
        db.equipos.delete(args.p_id);
        return { data: true, error: null };
      }
      if (name === "next_equipo_id") {
        const id = `EQ-${String(db.nextEquipoNumber++).padStart(3, "0")}`;
        return { data: id, error: null };
      }
      return { data: null, error: { code: "PGRST202", message: `Función ${name} no encontrada` } };
    },
  };
}

module.exports = { createFakeDb, createFakeSupabase };
