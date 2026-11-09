import {
  agruparPorDepartamento,
  departamentosAdministrativos,
  mascaraFecha,
  buscarPersonal,
  equiposDePersona,
  esAdministrativo,
  estaActivo,
  formatearFecha,
  formularioDesde,
  leerFecha,
  validarFormulario,
} from "../src/utils/personal";

const persona = (nombre: string, departamento: string | null = null, fecha_termino: string | null = null) => ({
  id: nombre,
  nombre,
  departamento,
  fecha_ingreso: null,
  fecha_termino,
  conducta: null,
  conducta_notas: null,
});

describe("buscarPersonal", () => {
  const lista = [persona("María López", "Control Escolar"), persona("José Pérez", "Finanzas"), persona("Ana Ruiz")];

  it("busca sin acentos ni mayúsculas y ordena por nombre", () => {
    expect(buscarPersonal(lista, "maria").map((p) => p.nombre)).toEqual(["María López"]);
    expect(buscarPersonal(lista, "").map((p) => p.nombre)).toEqual(["Ana Ruiz", "José Pérez", "María López"]);
  });

  it("busca también por departamento y exige todas las palabras", () => {
    expect(buscarPersonal(lista, "finanzas").map((p) => p.nombre)).toEqual(["José Pérez"]);
    expect(buscarPersonal(lista, "jose escolar")).toEqual([]);
  });
});

describe("estaActivo", () => {
  it("sin fecha de término o con término futuro sigue laborando", () => {
    expect(estaActivo(persona("A"), "2026-11-06")).toBe(true);
    expect(estaActivo(persona("A", null, "2026-11-06"), "2026-11-06")).toBe(true);
    expect(estaActivo(persona("A", null, "2026-11-05"), "2026-11-06")).toBe(false);
  });
});

describe("fechas", () => {
  it("convierte DD/MM/AAAA a AAAA-MM-DD y de regreso", () => {
    expect(leerFecha("15/03/2026")).toBe("2026-03-15");
    expect(leerFecha("5-3-2026")).toBe("2026-03-05");
    expect(leerFecha("")).toBeNull();
    expect(formatearFecha("2026-03-15")).toBe("15/03/2026");
  });

  it("rechaza fechas inexistentes o mal escritas", () => {
    expect(leerFecha("31/02/2026")).toBeUndefined();
    expect(leerFecha("2026-03-15")).toBeUndefined();
  });
});

describe("validarFormulario", () => {
  it("exige nombre y limpia espacios", () => {
    expect(validarFormulario({ ...formularioDesde(null), nombre: "  " }).ok).toBe(false);
    const r = validarFormulario({ ...formularioDesde(null), nombre: " María   López ", departamento: " " });
    expect(r).toEqual({
      ok: true,
      datos: {
        nombre: "María López",
        departamento: null,
        fecha_ingreso: null,
        fecha_termino: null,
        conducta: null,
        conducta_notas: null,
      },
    });
  });

  it("no permite terminar antes de ingresar", () => {
    const r = validarFormulario({ ...formularioDesde(null), nombre: "A", fechaIngreso: "10/05/2026", fechaTermino: "01/05/2026" });
    expect(r.ok).toBe(false);
  });
});

describe("equipos administrativos", () => {
  it("reconoce la categoría y los equipos de una persona", () => {
    expect(esAdministrativo({ categoria: " administrativos " })).toBe(true);
    expect(esAdministrativo({ categoria: "CÓMPUTO" })).toBe(false);
    const equipos = [
      { id: "EQ-1", personal_id: "p1" },
      { id: "EQ-2", personal_id: null },
      { id: "EQ-3", personal_id: "p1" },
    ];
    expect(equiposDePersona(equipos, "p1").map((e) => e.id)).toEqual(["EQ-1", "EQ-3"]);
  });
});

describe("departamentosAdministrativos", () => {
  it("usa las subcategorías de ADMINISTRATIVOS sin GENERAL ni otras categorías", () => {
    const carpetas = [
      { id: "1", parent_id: null, nombre: "ADMINISTRATIVOS", nivel: 1 as const },
      { id: "2", parent_id: "1", nombre: "FINANZAS", nivel: 2 as const },
      { id: "3", parent_id: "1", nombre: "GENERAL", nivel: 2 as const },
      { id: "4", parent_id: null, nombre: "CÓMPUTO", nivel: 1 as const },
      { id: "5", parent_id: "4", nombre: "LAPTOPS", nivel: 2 as const },
    ];
    const equipos = [{ categoria: "Administrativos", subcategoria: "control escolar" }];
    expect(departamentosAdministrativos(carpetas, equipos)).toEqual(["CONTROL ESCOLAR", "FINANZAS"]);
  });
});

describe("mascaraFecha", () => {
  it("agrega las diagonales al escribir solo números", () => {
    expect(mascaraFecha("1")).toBe("1");
    expect(mascaraFecha("150")).toBe("15/0");
    expect(mascaraFecha("15032026")).toBe("15/03/2026");
    expect(mascaraFecha("150320261")).toBe("15/03/2026");
    expect(leerFecha(mascaraFecha("15032026"))).toBe("2026-03-15");
  });

  it("al borrar no deja diagonales colgando y respeta lo pegado con diagonales", () => {
    expect(mascaraFecha("15/")).toBe("15");
    expect(mascaraFecha("15/03/")).toBe("15/03");
    expect(mascaraFecha("15/03/2026")).toBe("15/03/2026");
  });
});

describe("agruparPorDepartamento", () => {
  it("ordena departamentos y nombres, con 'Sin departamento' al final", () => {
    const lista = [
      persona("Zoe", "FINANZAS"),
      persona("Ana"),
      persona("Bruno", "CONTROL ESCOLAR"),
      persona("Alma", "FINANZAS"),
    ];
    expect(agruparPorDepartamento(lista).map((g) => [g.titulo, g.data.map((p) => p.nombre)])).toEqual([
      ["CONTROL ESCOLAR", ["Bruno"]],
      ["FINANZAS", ["Alma", "Zoe"]],
      ["Sin departamento", ["Ana"]],
    ]);
  });
});
