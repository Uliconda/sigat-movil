import { BRAND } from "../theme/colors";

// Mismo formato que escribe SIGAT Web, para que ambos sistemas cuenten igual.
// Al comparar siempre se normaliza a mayúsculas, porque hay datos históricos
// guardados como "PRESTADO" o "DISPONIBLE".
export const ESTADOS = {
  DISPONIBLE: "Disponible",
  PRESTADO: "Prestado",
  SIN_ENTREGAR: "Sin entregar",
  NO_RESPONDE: "No responde",
  FUERA_DE_SERVICIO: "Fuera de Servicio",
} as const;

export const CONDICIONES = {
  BUEN_ESTADO: "Buen estado",
  ACEPTABLE: "Aceptable",
  REEMPLAZAR: "Reemplazar",
} as const;

export type Condicion = (typeof CONDICIONES)[keyof typeof CONDICIONES];

export interface EstadoInfo {
  label: string;
  color: string;
  isDisponible: boolean;
  isPrestado: boolean;
  isNoResponde: boolean;
  isFueraDeServicio: boolean;
  /** Solo se presta lo que está libre y en servicio. */
  canPrestar: boolean;
  /** Se devuelve (o recupera) lo que alguien tiene en su poder. */
  canDevolver: boolean;
}

export interface CondicionInfo {
  label: string;
  color: string;
  nota: string;
}

const normalizar = (texto?: string | null) => (texto ? String(texto).toUpperCase() : "");
const es = (estado: string | null | undefined, valor: string) => normalizar(estado) === normalizar(valor);

// Información derivada del estado de un equipo: color y reglas de negocio.
export function getEstadoInfo(estado?: string | null): EstadoInfo {
  const isNoResponde = es(estado, ESTADOS.NO_RESPONDE);
  const isPrestado = es(estado, ESTADOS.PRESTADO) || es(estado, ESTADOS.SIN_ENTREGAR);
  const isFueraDeServicio = es(estado, ESTADOS.FUERA_DE_SERVICIO);
  const isDisponible = !estado || es(estado, ESTADOS.DISPONIBLE);

  let color: string = BRAND.success;
  if (isNoResponde) color = BRAND.magenta;
  else if (isPrestado) color = BRAND.danger;
  else if (isFueraDeServicio) color = BRAND.neutral;

  return {
    label: estado || ESTADOS.DISPONIBLE,
    color,
    isDisponible,
    isPrestado,
    isNoResponde,
    isFueraDeServicio,
    canPrestar: !isPrestado && !isFueraDeServicio && !isNoResponde,
    canDevolver: (isPrestado || isNoResponde) && !isFueraDeServicio,
  };
}

// Color y nota de la condición física registrada en la última devolución.
export function getCondicionInfo(condicion?: string | null): CondicionInfo {
  const label = condicion || CONDICIONES.BUEN_ESTADO;
  if (label === CONDICIONES.ACEPTABLE) {
    return { label, color: BRAND.warning, nota: "Falta poco para reemplazar" };
  }
  if (label === CONDICIONES.REEMPLAZAR) {
    return { label, color: BRAND.danger, nota: "" };
  }
  return { label, color: BRAND.success, nota: "" };
}
