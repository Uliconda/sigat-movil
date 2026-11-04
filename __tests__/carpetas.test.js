import {
  buildCarpetasTree,
  buildCategoryTree,
  buildInventoryTree,
  buscarEquipos,
  contarPorCarpeta,
  findCarpetaId,
  mergeTrees,
  tieneCarpetasReales,
} from "../src/utils/carpetas";

const carpetas = [
  { id: "c1", parent_id: null, nombre: "CÓMPUTO", nivel: 1 },
  { id: "c2", parent_id: "c1", nombre: "LAPTOPS", nivel: 2 },
  { id: "c3", parent_id: "c2", nombre: "DELL", nivel: 3 },
  { id: "c4", parent_id: "c1", nombre: "IMPRESORAS", nivel: 2 },
  { id: "c5", parent_id: null, nombre: "MOBILIARIO", nivel: 1 },
];

describe("tabla carpetas", () => {
  it("construye el árbol, incluidas las carpetas vacías", () => {
    expect(buildCarpetasTree(carpetas)).toEqual({
      "CÓMPUTO": { LAPTOPS: ["DELL"], IMPRESORAS: [] },
      MOBILIARIO: {},
    });
  });

  it("une el árbol del servidor con el de los equipos sin repetir", () => {
    expect(mergeTrees({ A: { X: ["1"] } }, { A: { X: ["1", "2"], Y: [] }, B: {} })).toEqual({
      A: { X: ["1", "2"], Y: [] },
      B: {},
    });
  });

  it("incluye carpetas de equipos creados sin conexión", () => {
    const tree = buildInventoryTree(carpetas, [{ id: "EQ-9", categoria: "Redes", subcategoria: "Switches" }]);
    expect(tree.REDES).toEqual({ SWITCHES: ["GENERAL"] });
    expect(tree["CÓMPUTO"].IMPRESORAS).toEqual([]);
  });

  it("encuentra el ID de una carpeta por su ruta", () => {
    expect(findCarpetaId(carpetas, ["Cómputo", "laptops", "Dell"])).toBe("c3");
    expect(findCarpetaId(carpetas, ["CÓMPUTO"])).toBe("c1");
    expect(findCarpetaId(carpetas, ["CÓMPUTO", "MONITORES"])).toBeNull();
  });

  it("cuenta en cero las carpetas vacías", () => {
    expect(contarPorCarpeta([], "categoria", ["MOBILIARIO"])).toEqual([{ nombre: "MOBILIARIO", cantidad: 0 }]);
  });
});

const inventario = [
  { id: "EQ-001", nombre: "Laptop Dell", categoria: "Cómputo", subcategoria: "Laptops", subSubcategoria: "Dell" },
  { id: "EQ-002", nombre: "Laptop HP", categoria: "CÓMPUTO", subcategoria: "laptops", subSubcategoria: "HP" },
  { id: "EQ-003", nombre: "Proyector Epson", categoria: "Audiovisual" },
  // Carpeta vacía: existe como plantilla y no cuenta como equipo.
  { id: "MOB-1", nombre: "Plantilla Sistema", categoria: "CÓMPUTO", subcategoria: "MONITORES", isTemplate: true },
];

describe("contarPorCarpeta", () => {
  it("agrupa sin distinguir mayúsculas y no cuenta plantillas", () => {
    expect(contarPorCarpeta(inventario, "categoria")).toEqual([
      { nombre: "AUDIOVISUAL", cantidad: 1 },
      { nombre: "CÓMPUTO", cantidad: 2 },
    ]);
  });

  it("muestra carpetas vacías creadas con plantillas", () => {
    const computo = inventario.filter((equipo) => equipo.categoria.toUpperCase() === "CÓMPUTO");
    expect(contarPorCarpeta(computo, "subcategoria")).toEqual([
      { nombre: "LAPTOPS", cantidad: 2 },
      { nombre: "MONITORES", cantidad: 0 },
    ]);
  });

  it("los equipos sin carpeta van a GENERAL", () => {
    const lista = contarPorCarpeta([inventario[2]], "subcategoria");
    expect(lista).toEqual([{ nombre: "GENERAL", cantidad: 1 }]);
    expect(tieneCarpetasReales(lista)).toBe(false);
  });
});

describe("buildCategoryTree", () => {
  it("construye el árbol de tres niveles", () => {
    expect(buildCategoryTree(inventario)).toEqual({
      "CÓMPUTO": { LAPTOPS: ["DELL", "HP"], MONITORES: ["GENERAL"] },
      AUDIOVISUAL: { GENERAL: ["GENERAL"] },
    });
  });
});

describe("buscarEquipos", () => {
  it("busca por nombre o ID sin distinguir mayúsculas", () => {
    expect(buscarEquipos(inventario, "laptop").map((e) => e.id)).toEqual(["EQ-001", "EQ-002"]);
    expect(buscarEquipos(inventario, "eq-003").map((e) => e.id)).toEqual(["EQ-003"]);
  });

  it("nunca devuelve plantillas", () => {
    expect(buscarEquipos(inventario, "plantilla")).toEqual([]);
  });
});
