// Pruebas de integración del modo sin conexión con un Supabase simulado en memoria.
import type AsyncStorageType from "@react-native-async-storage/async-storage";
import type * as SupabaseData from "../src/services/supabaseData";
import type { FakeDb } from "../test/fakeSupabase";

const mockDb: FakeDb = require("../test/fakeSupabase").createFakeDb();

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({ isConnected: mockDb.online })),
    addEventListener: jest.fn(() => () => {}),
  },
}));
jest.mock("../src/services/supabaseClient", () => ({
  supabase: require("../test/fakeSupabase").createFakeSupabase(mockDb),
}));

const USER_ID = "user-1";
// Deja terminar las sincronizaciones que se disparan solas en segundo plano.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let data: typeof SupabaseData;
let AsyncStorage: typeof AsyncStorageType;

beforeEach(async () => {
  jest.resetModules();
  AsyncStorage = require("@react-native-async-storage/async-storage");
  await AsyncStorage.clear();
  data = require("../src/services/supabaseData");

  mockDb.online = true;
  mockDb.historial = [];
  mockDb.nextEquipoNumber = 43;
  mockDb.equipos = new Map([
    ["EQ-001", { nombre: "Laptop Dell", estado: "Disponible", categoria: "CÓMPUTO" }],
    ["EQ-042", { nombre: "Proyector", estado: "Disponible", categoria: "AUDIOVISUAL" }],
  ]);

  // El teléfono descarga el inventario una vez con conexión (queda en caché).
  await data.getEquipos();
});

async function prestarSinConexion() {
  mockDb.online = false;
  await data.updateEquipo(
    "EQ-001",
    { estado: "Prestado", alumno_nombre: "Ana López" },
    { idEquipo: "EQ-001", accion: "PRÉSTAMO", fecha: new Date("2026-11-03T10:00:00Z") }
  );
  await flush();
}

describe("cambios sin conexión", () => {
  it("guarda el préstamo en el teléfono y lo muestra en el inventario local", async () => {
    await prestarSinConexion();

    const local = await data.getEquiposLocal();
    expect(local.find((equipo) => equipo.id === "EQ-001")).toMatchObject({ estado: "Prestado", alumno_nombre: "Ana López" });
    expect(mockDb.equipos.get("EQ-001")?.estado).toBe("Disponible");
    expect((await data.getSyncStatus(USER_ID)).pending).toBe(1);
  });

  it("carga el inventario desde la caché cuando no hay conexión", async () => {
    mockDb.online = false;
    const equipos = await data.getEquipos();
    expect(equipos.map((equipo) => equipo.id).sort()).toEqual(["EQ-001", "EQ-042"]);
  });

  it("consulta un equipo desde la caché cuando no hay conexión", async () => {
    mockDb.online = false;
    expect(await data.getEquipo("EQ-042")).toMatchObject({ id: "EQ-042", nombre: "Proyector" });
    expect(await data.getEquipo("EQ-999")).toBeNull();
  });
});

describe("sincronización", () => {
  it("envía el cambio y el historial al recuperar la conexión", async () => {
    await prestarSinConexion();

    mockDb.online = true;
    await data.syncPendingChanges(USER_ID);

    expect(mockDb.equipos.get("EQ-001")).toMatchObject({ estado: "Prestado", alumno_nombre: "Ana López" });
    expect(mockDb.historial).toHaveLength(1);
    expect(mockDb.historial[0].data).toMatchObject({ accion: "PRÉSTAMO", idEquipo: "EQ-001" });
    expect((await data.getSyncStatus(USER_ID)).pending).toBe(0);
  });

  it("marca conflicto si otro dispositivo cambió el equipo mientras tanto", async () => {
    await prestarSinConexion();
    mockDb.equipos.set("EQ-001", { ...mockDb.equipos.get("EQ-001"), estado: "Fuera de Servicio" });

    mockDb.online = true;
    await data.syncPendingChanges(USER_ID);

    const status = await data.getSyncStatus(USER_ID);
    expect(status.conflicts).toBe(1);
    expect(status.conflictItems[0]).toMatchObject({ equipoId: "EQ-001", type: "update" });
    // No se sobrescribe el cambio del otro dispositivo ni se registra historial.
    expect(mockDb.equipos.get("EQ-001")?.estado).toBe("Fuera de Servicio");
    expect(mockDb.historial).toHaveLength(0);
  });

  it("'Conservar Supabase' descarta el cambio local en conflicto", async () => {
    await prestarSinConexion();
    mockDb.equipos.set("EQ-001", { ...mockDb.equipos.get("EQ-001"), estado: "Fuera de Servicio" });
    mockDb.online = true;
    await data.syncPendingChanges(USER_ID);
    const [conflict] = (await data.getSyncStatus(USER_ID)).conflictItems;

    await data.resolveOfflineConflict(USER_ID, conflict.id, "keep-server");

    expect((await data.getSyncStatus(USER_ID)).pending).toBe(0);
    expect((await data.getEquiposLocal()).find((e) => e.id === "EQ-001")?.estado).toBe("Fuera de Servicio");
  });

  it("'Aplicar mis cambios' reintenta sobre la versión de Supabase", async () => {
    await prestarSinConexion();
    mockDb.equipos.set("EQ-001", { ...mockDb.equipos.get("EQ-001"), marca: "Dell" });
    mockDb.online = true;
    await data.syncPendingChanges(USER_ID);
    const [conflict] = (await data.getSyncStatus(USER_ID)).conflictItems;

    await data.resolveOfflineConflict(USER_ID, conflict.id, "keep-local");
    await flush();
    await data.syncPendingChanges(USER_ID);

    // Se conserva el cambio remoto (marca) y se aplica el local (estado).
    expect(mockDb.equipos.get("EQ-001")).toMatchObject({ marca: "Dell", estado: "Prestado" });
    expect((await data.getSyncStatus(USER_ID)).pending).toBe(0);
  });

  it("da de alta un equipo creado sin conexión", async () => {
    mockDb.online = false;
    await data.saveEquipo("EQ-100", { nombre: "Router", estado: "Disponible" });
    await flush();

    mockDb.online = true;
    await data.syncPendingChanges(USER_ID);

    expect(mockDb.equipos.get("EQ-100")).toEqual({ nombre: "Router", estado: "Disponible" });
  });

  it("no permite registrar dos equipos con el mismo ID", async () => {
    await expect(data.saveEquipo("EQ-042", { nombre: "Duplicado" })).rejects.toThrow("Ya existe un equipo");
  });
});

describe("tiempo real", () => {
  it("mantiene los cambios pendientes encima del dato que llega de Supabase", async () => {
    await prestarSinConexion();

    const { equipo } = await data.applyRemoteChange("UPDATE", {
      id: "EQ-001",
      data: { nombre: "Laptop Dell Latitude", estado: "Disponible", categoria: "CÓMPUTO" },
    });

    expect(equipo).toMatchObject({ nombre: "Laptop Dell Latitude", estado: "Prestado" });
  });

  it("quita de la caché un equipo eliminado en otro dispositivo", async () => {
    const { equipo } = await data.applyRemoteChange("DELETE", { id: "EQ-042" });
    expect(equipo).toBeNull();
    expect((await data.getEquiposLocal()).map((e) => e.id)).toEqual(["EQ-001"]);
  });
});

describe("carpetas", () => {
  beforeEach(() => {
    mockDb.carpetas = [
      { id: "c-1", parent_id: null, nombre: "CÓMPUTO", nivel: 1 },
      { id: "c-2", parent_id: "c-1", nombre: "LAPTOPS", nivel: 2 },
    ];
  });

  it("guarda las carpetas para consultarlas sin conexión", async () => {
    await data.getCarpetas();
    mockDb.online = false;
    expect((await data.getCarpetas()).map((c) => c.nombre)).toEqual(["CÓMPUTO", "LAPTOPS"]);
  });

  it("crea una carpeta en el servidor y actualiza la caché", async () => {
    await data.crearCarpeta("c-1", "Monitores");
    expect((await data.getCarpetasLocal()).map((c) => c.nombre)).toContain("MONITORES");
  });

  it("muestra el mensaje del servidor si la carpeta ya existe", async () => {
    await expect(data.crearCarpeta("c-1", "laptops")).rejects.toThrow('Ya existe una carpeta "LAPTOPS"');
  });

  it("pide conexión para administrar carpetas", async () => {
    mockDb.online = false;
    await expect(data.crearCarpeta("c-1", "Monitores")).rejects.toThrow("Necesitas conexión");
    expect(mockDb.carpetas).toHaveLength(2);
  });
});

describe("getNextEquipoId", () => {
  it("reserva el ID en Supabase cuando hay conexión", async () => {
    expect(await data.getNextEquipoId()).toEqual({ id: "EQ-043", provisional: false });
    expect(await data.getNextEquipoId()).toEqual({ id: "EQ-044", provisional: false });
  });

  it("sin conexión calcula un ID provisional con el inventario local", async () => {
    mockDb.online = false;
    expect(await data.getNextEquipoId()).toEqual({ id: "EQ-043", provisional: true });
  });
});
