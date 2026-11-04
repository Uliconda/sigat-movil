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
};

export const CONDICIONES = {
  BUEN_ESTADO: "Buen estado",
  ACEPTABLE: "Aceptable",
  REEMPLAZAR: "Reemplazar",
};

const normalizar = (texto) => (texto ? String(texto).toUpperCase() : "");
const es = (estado, valor) => normalizar(estado) === normalizar(valor);

// Información derivada del estado de un equipo: color y reglas de negocio.
export function getEstadoInfo(estado) {
  const isNoResponde = es(estado, ESTADOS.NO_RESPONDE);
  const isPrestado = es(estado, ESTADOS.PRESTADO) || es(estado, ESTADOS.SIN_ENTREGAR);
  const isFueraDeServicio = es(estado, ESTADOS.FUERA_DE_SERVICIO);
  const isDisponible = !estado || es(estado, ESTADOS.DISPONIBLE);

  let color = BRAND.success;
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
    // Solo se presta lo que está libre y en servicio.
    canPrestar: !isPrestado && !isFueraDeServicio && !isNoResponde,
    // Se devuelve (o recupera) lo que alguien tiene en su poder.
    canDevolver: (isPrestado || isNoResponde) && !isFueraDeServicio,
  };
}

// Color y nota de la condición física registrada en la última devolución.
export function getCondicionInfo(condicion) {
  const label = condicion || CONDICIONES.BUEN_ESTADO;
  if (label === CONDICIONES.ACEPTABLE) {
    return { label, color: BRAND.warning, nota: "Falta poco para reemplazar" };
  }
  if (label === CONDICIONES.REEMPLAZAR) {
    return { label, color: BRAND.danger, nota: "" };
  }
  return { label, color: BRAND.success, nota: "" };
}
