import type { Equipo } from "../src/types";
import {
  areaDe,
  contarPorEdificio,
  contarPorEstado,
  describirUbicacion,
  esPrestamoVencido,
  fechaPrestamo,
  filtrarEquipos,
  normalizarUbicacion,
  SIN_EDIFICIO,
  SIN_AREA,
  SIN_ESPACIO,
  espacioDe,
  ubicacionParaGuardar,
} from "../src/utils/ubicacion";

const AHORA = new Date("2026-11-19T12:00:00Z").getTime();
const haceHoras = (h: number) => new Date(AHORA - h * 3600 * 1000).toISOString();

const equipos: Equipo[] = [
  { id: "EQ-001", nombre: "Laptop", categoria: "CÓMPUTO", subcategoria: "LAPTOPS", edificio: "EDIFICIO A", espacio: "AULA 3", estado: "Disponible" },
  { id: "EQ-002", nombre: "Laptop 2", categoria: "Cómputo", subcategoria: "laptops", edificio: "EDIFICIO A", espacio: null, estado: "Prestado", fecha_prestamo: haceHoras(50) },
  { id: "EQ-003", nombre: "Proyector", categoria: "AUDIOVISUAL", edificio: "EDIFICIO B", estado: "No responde" },
  { id: "EQ-004", nombre: "Silla", categoria: "MOBILIARIO", estado: "Fuera de Servicio" },
  { id: "EQ-005", nombre: "Laptop admin", categoria: "ADMINISTRATIVOS", edificio: "EDIFICIO B", estado: "Prestado", fecha_prestamo: haceHoras(500) },
  { id: "EQ-006", nombre: "Cable", categoria: "ACCESORIOS", edificio: "EDIFICIO A", estado: "Prestado", fecha_prestamo: haceHoras(5) },
  { id: "MOB-1", nombre: "Plantilla Sistema", categoria: "CÓMPUTO", isTemplate: true },
];

describe("normalización (igual que normalizar_ubicacion en Supabase)", () => {
  test("mayúsculas, espacios colapsados y null si está vacío", () => {
    expect(normalizarUbicacion("  edificio   a ")).toBe("EDIFICIO A");
    expect(normalizarUbicacion("   ")).toBeNull();
    expect(normalizarUbicacion(undefined)).toBeNull();
  });

  test("sin edificio no se guarda espacio", () => {
    expect(ubicacionParaGuardar("", "Aula 3", "Caja")).toEqual({ edificio: null, espacio: null, area: null });
    expect(ubicacionParaGuardar("edif a", " aula 3 ")).toEqual({ edificio: "EDIF A", espacio: "AULA 3", area: null });
  });

  test("sin espacio no se guarda área (igual que el servidor)", () => {
    expect(ubicacionParaGuardar("Rectoría", "", "Contabilidad")).toEqual({ edificio: "RECTORÍA", espacio: null, area: null });
    expect(ubicacionParaGuardar("rectoría", "planta baja", "  recursos   humanos ")).toEqual({
      edificio: "RECTORÍA",
      espacio: "PLANTA BAJA",
      area: "RECURSOS HUMANOS",
    });
  });

  test("describe la ubicación para las tarjetas", () => {
    expect(describirUbicacion(equipos[0])).toBe("EDIFICIO A › AULA 3");
    expect(describirUbicacion(equipos[1])).toBe("EDIFICIO A");
    expect(describirUbicacion(equipos[3])).toBeNull();
    expect(espacioDe({ edificio: null, espacio: "AULA 3" })).toBe(SIN_ESPACIO);
    expect(describirUbicacion({ edificio: "A", espacio: "AULA 3", area: "CAJA" })).toBe("A › AULA 3 › CAJA");
    expect(describirUbicacion({ edificio: "A", espacio: null, area: "CAJA" })).toBe("A");
    expect(areaDe({ edificio: "A", espacio: null, area: "CAJA" })).toBe(SIN_AREA);
  });
});

describe("préstamos vencidos (misma regla que el servidor)", () => {
  test("No responde siempre cuenta como vencido", () => {
    expect(esPrestamoVencido(equipos[2], AHORA)).toBe(true);
  });

  test("Prestado con más de 48 h cuenta, aunque el servidor aún no lo marque", () => {
    expect(esPrestamoVencido(equipos[1], AHORA)).toBe(true);
    expect(esPrestamoVencido(equipos[5], AHORA)).toBe(false);
  });

  test("ADMINISTRATIVOS no vence", () => {
    expect(esPrestamoVencido(equipos[4], AHORA)).toBe(false);
  });

  test("entiende fechas de Firestore y descarta fechas inválidas", () => {
    expect(fechaPrestamo({ seconds: 10 })?.getTime()).toBe(10000);
    expect(fechaPrestamo("no es fecha")).toBeNull();
    expect(esPrestamoVencido({ id: "X", estado: "Prestado", fecha_prestamo: "no es fecha" }, AHORA)).toBe(false);
  });
});

describe("conteos rápidos", () => {
  test("por estado (Prestados incluye los vencidos; sin plantillas)", () => {
    expect(contarPorEstado(equipos, AHORA)).toEqual({ disponible: 1, prestado: 4, vencido: 2, fuera: 1 });
  });

  test("por edificio, con los del catálogo vacíos y SIN EDIFICIO al final", () => {
    const conteo = contarPorEdificio(equipos, [{ nombre: "EDIFICIO B" }, { nombre: "EDIFICIO C" }]);
    expect(conteo).toEqual([
      { nombre: "EDIFICIO A", cantidad: 3 },
      { nombre: "EDIFICIO B", cantidad: 2 },
      { nombre: "EDIFICIO C", cantidad: 0 },
      { nombre: SIN_EDIFICIO, cantidad: 1 },
    ]);
  });
});

describe("filtros del listado", () => {
  test("edificio + categoría sin distinguir mayúsculas", () => {
    expect(filtrarEquipos(equipos, { edificio: "EDIFICIO A", categoria: "cómputo" }, AHORA).map((e) => e.id)).toEqual(["EQ-001", "EQ-002"]);
  });

  test("espacio, subcategoría y estado", () => {
    expect(filtrarEquipos(equipos, { edificio: "EDIFICIO A", espacio: SIN_ESPACIO }, AHORA).map((e) => e.id)).toEqual(["EQ-002", "EQ-006"]);
    const conArea: Equipo[] = [
      { id: "R-1", nombre: "PC", edificio: "RECTORÍA", espacio: "PLANTA BAJA", area: "CAJA" },
      { id: "R-2", nombre: "PC", edificio: "RECTORÍA", espacio: "PLANTA BAJA" },
    ];
    expect(filtrarEquipos(conArea, { edificio: "RECTORÍA", espacio: "PLANTA BAJA", area: "CAJA" }, AHORA).map((e) => e.id)).toEqual(["R-1"]);
    expect(filtrarEquipos(conArea, { edificio: "RECTORÍA", area: SIN_AREA }, AHORA).map((e) => e.id)).toEqual(["R-2"]);
    expect(filtrarEquipos(equipos, { subcategoria: "LAPTOPS", estado: "vencido" }, AHORA).map((e) => e.id)).toEqual(["EQ-002"]);
  });

  test("SIN EDIFICIO y búsqueda por texto", () => {
    expect(filtrarEquipos(equipos, { edificio: SIN_EDIFICIO }, AHORA).map((e) => e.id)).toEqual(["EQ-004"]);
    expect(filtrarEquipos(equipos, { texto: "laptop" }, AHORA).map((e) => e.id)).toEqual(["EQ-001", "EQ-002", "EQ-005"]);
  });
});
