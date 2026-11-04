import { normalizarCarpeta } from "../src/constants/categorias";
import { CONDICIONES, ESTADOS, getCondicionInfo, getEstadoInfo } from "../src/constants/estados";
import { canManage, isSuperadmin } from "../src/constants/roles";
import { BRAND } from "../src/theme/colors";

describe("getEstadoInfo", () => {
  it("un equipo disponible se puede prestar pero no devolver", () => {
    const info = getEstadoInfo(ESTADOS.DISPONIBLE);
    expect(info).toMatchObject({ isDisponible: true, canPrestar: true, canDevolver: false, color: BRAND.success });
  });

  it("un equipo prestado se puede devolver pero no prestar", () => {
    const info = getEstadoInfo(ESTADOS.PRESTADO);
    expect(info).toMatchObject({ isPrestado: true, canPrestar: false, canDevolver: true, color: BRAND.danger });
  });

  it("acepta los valores históricos en mayúsculas", () => {
    expect(getEstadoInfo("PRESTADO").isPrestado).toBe(true);
    expect(getEstadoInfo("DISPONIBLE").isDisponible).toBe(true);
    expect(getEstadoInfo("FUERA DE SERVICIO").isFueraDeServicio).toBe(true);
  });

  it("'Sin entregar' cuenta como prestado", () => {
    expect(getEstadoInfo("Sin entregar").isPrestado).toBe(true);
  });

  it("'No responde' bloquea el préstamo pero permite recuperar el equipo", () => {
    const info = getEstadoInfo("No responde");
    expect(info).toMatchObject({ isNoResponde: true, canPrestar: false, canDevolver: true, color: BRAND.magenta });
  });

  it("un equipo fuera de servicio no se presta ni se devuelve", () => {
    const info = getEstadoInfo(ESTADOS.FUERA_DE_SERVICIO);
    expect(info).toMatchObject({ canPrestar: false, canDevolver: false, color: BRAND.neutral });
  });

  it("sin estado se considera disponible", () => {
    expect(getEstadoInfo(undefined)).toMatchObject({ isDisponible: true, label: ESTADOS.DISPONIBLE });
  });
});

describe("getCondicionInfo", () => {
  it("por defecto es 'Buen estado'", () => {
    expect(getCondicionInfo(null)).toMatchObject({ label: CONDICIONES.BUEN_ESTADO, color: BRAND.success });
  });

  it("'Aceptable' incluye una nota de advertencia", () => {
    expect(getCondicionInfo(CONDICIONES.ACEPTABLE)).toMatchObject({ color: BRAND.warning, nota: expect.any(String) });
  });

  it("'Reemplazar' se marca en rojo", () => {
    expect(getCondicionInfo(CONDICIONES.REEMPLAZAR).color).toBe(BRAND.danger);
  });
});

describe("roles", () => {
  it.each([
    ["admin", true, false],
    ["superadmin", true, true],
    ["usuario", false, false],
    ["Administrador", false, false],
    [undefined, false, false],
  ])("rol %p → administra: %p, superadmin: %p", (rol, admin, superadmin) => {
    expect(canManage({ rol })).toBe(admin);
    expect(isSuperadmin({ rol })).toBe(superadmin);
  });

  it("sin perfil no administra", () => {
    expect(canManage(null)).toBe(false);
  });
});

describe("normalizarCarpeta", () => {
  it.each([
    ["Laptops", "LAPTOPS"],
    ["  redes ", "REDES"],
    ["", "GENERAL"],
    [null, "GENERAL"],
  ])("%p → %p", (entrada, esperado) => {
    expect(normalizarCarpeta(entrada)).toBe(esperado);
  });
});
