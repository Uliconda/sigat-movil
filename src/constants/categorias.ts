import { BRAND } from "../theme/colors";

export const CATEGORIA_GENERAL = "GENERAL";

// Valor especial de los selectores para escribir una carpeta nueva.
export const OPCION_OTRA = "Otra";

export interface CategoriaConfig {
  icon: string;
  color: string;
}

const CATEGORY_CONFIG: Record<string, CategoriaConfig> = {
  "CÓMPUTO": { icon: "💻", color: "#4A90E2" },
  AUDIOVISUAL: { icon: "📽️", color: "#E94A67" },
  REDES: { icon: "🌐", color: "#50E3C2" },
  ACCESORIOS: { icon: "🔌", color: "#F5A623" },
  MOBILIARIO: { icon: "🪑", color: "#8B572A" },
  ADMINISTRATIVOS: { icon: "💼", color: "#8E24AA" },
  GENERAL: { icon: "📦", color: "#9B9B9B" },
  OTROS: { icon: "📦", color: "#9B9B9B" },
};

export function getCategoriaConfig(nombre?: string | null): CategoriaConfig {
  return CATEGORY_CONFIG[normalizarCarpeta(nombre)] ?? { icon: "📁", color: BRAND.primary };
}

// Nombre de carpeta normalizado; vacío = "GENERAL".
export function normalizarCarpeta(nombre?: unknown): string {
  const limpio = nombre ? String(nombre).trim().toUpperCase() : "";
  return limpio || CATEGORIA_GENERAL;
}
