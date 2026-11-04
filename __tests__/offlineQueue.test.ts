import {
  applyQueue,
  isNetworkError,
  nextLocalEquipoId,
  OfflineError,
  sameData,
  summarizeQueue,
  withoutLocalId,
} from "../src/services/offlineQueue";
import type { QueueOperation } from "../src/types";

describe("applyQueue", () => {
  const base = [
    { id: "EQ-001", nombre: "Laptop", estado: "Disponible" },
    { id: "EQ-002", nombre: "Proyector", estado: "Disponible" },
  ];

  it("aplica altas, cambios y bajas en orden", () => {
    const result = applyQueue(base, [
      { type: "create", equipoId: "EQ-003", data: { nombre: "Router" } },
      { type: "update", equipoId: "EQ-001", changes: { estado: "Prestado" } },
      { type: "delete", equipoId: "EQ-002" },
    ]);

    expect(result).toEqual([
      { id: "EQ-001", nombre: "Laptop", estado: "Prestado" },
      { id: "EQ-003", nombre: "Router" },
    ]);
  });

  it("aplica cambios sobre un equipo creado en la misma cola", () => {
    const result = applyQueue([], [
      { type: "create", equipoId: "EQ-010", data: { nombre: "Cámara", estado: "Disponible" } },
      { type: "update", equipoId: "EQ-010", changes: { estado: "Prestado" } },
    ]);
    expect(result).toEqual([{ id: "EQ-010", nombre: "Cámara", estado: "Prestado" }]);
  });

  it("ignora cambios de equipos que ya no existen", () => {
    const result = applyQueue(base, [
      { type: "delete", equipoId: "EQ-001" },
      { type: "update", equipoId: "EQ-001", changes: { estado: "Prestado" } },
    ]);
    expect(result.map((equipo) => equipo.id)).toEqual(["EQ-002"]);
  });

  it("no modifica la lista original", () => {
    const copia = JSON.parse(JSON.stringify(base));
    applyQueue(base, [{ type: "update", equipoId: "EQ-001", changes: { estado: "Prestado" } }]);
    expect(base).toEqual(copia);
  });
});

describe("sameData", () => {
  it("compara objetos sin importar el orden de las llaves", () => {
    expect(sameData({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
  });

  it("detecta valores distintos", () => {
    expect(sameData({ estado: "Disponible" }, { estado: "Prestado" })).toBe(false);
  });
});

describe("isNetworkError", () => {
  it.each([
    [new OfflineError(), true],
    [new TypeError("Network request failed"), true],
    [new Error("Failed to fetch"), true],
    [new Error("Request timed out"), true],
    [{ status: 503, message: "Service Unavailable" }, true],
    [{ status: 403, message: "permission denied" }, false],
    [new Error("Ya existe un equipo con el ID EQ-001."), false],
  ])("%p → %p", (error, expected) => {
    expect(isNetworkError(error)).toBe(expected);
  });
});

describe("nextLocalEquipoId", () => {
  it("devuelve el siguiente número después del mayor EQ-XXX", () => {
    expect(nextLocalEquipoId([{ id: "EQ-007" }, { id: "EQ-041" }, { id: "EQ-012" }])).toBe("EQ-042");
  });

  it("ignora IDs con otro formato", () => {
    expect(nextLocalEquipoId([{ id: "MOB-123-abc" }, { id: "EQ-ABC" }, { id: "EQ-002" }])).toBe("EQ-003");
  });

  it("empieza en EQ-001 si no hay equipos", () => {
    expect(nextLocalEquipoId([])).toBe("EQ-001");
  });

  it("admite más de tres dígitos", () => {
    expect(nextLocalEquipoId([{ id: "EQ-999" }])).toBe("EQ-1000");
  });
});

describe("summarizeQueue / withoutLocalId", () => {
  it("cuenta pendientes y conflictos", () => {
    const summary = summarizeQueue([
      { id: "1", equipoId: "EQ-001", type: "update", status: "pending" },
      { id: "2", equipoId: "EQ-002", type: "update", status: "conflict", error: "cambió" },
    ] as QueueOperation[]);
    expect(summary).toEqual({
      pending: 2,
      conflicts: 1,
      conflictItems: [{ id: "2", equipoId: "EQ-002", type: "update", error: "cambió" }],
    });
  });

  it("quita el id local antes de comparar con Supabase", () => {
    expect(withoutLocalId({ id: "EQ-001", nombre: "Laptop" })).toEqual({ nombre: "Laptop" });
  });
});
