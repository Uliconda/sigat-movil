import {
  buildCategoryTree,
  buscarEquipos,
  contarPorCarpeta,
  tieneCarpetasReales,
} from "../src/utils/carpetas";

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
