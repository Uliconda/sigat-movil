// Valida la configuración de Supabase sin depender de React Native, para poder
// probarla y para que la app muestre un mensaje en lugar de cerrarse.

export interface SupabaseConfig {
  url: string;
  key: string;
}

export type ConfigResult = { ok: true; config: SupabaseConfig } | { ok: false; error: string };

// Valores de ejemplo como "<project-ref>" o "<publishable-key>".
const esEjemplo = (valor: string) => /[<>]/.test(valor);

export function validateSupabaseConfig(url?: string, key?: string): ConfigResult {
  const faltantes: string[] = [];
  if (!url?.trim()) faltantes.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!key?.trim()) faltantes.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (faltantes.length) {
    return { ok: false, error: `Faltan las variables ${faltantes.join(" y ")}.` };
  }

  const urlLimpia = url!.trim();
  const keyLimpia = key!.trim();

  if (esEjemplo(urlLimpia) || esEjemplo(keyLimpia)) {
    return {
      ok: false,
      error: "Las variables de Supabase tienen los valores de ejemplo (<project-ref>, <publishable-key>) en lugar de los reales.",
    };
  }
  if (!/^https?:\/\/\S+$/.test(urlLimpia)) {
    return { ok: false, error: "EXPO_PUBLIC_SUPABASE_URL no es una URL válida (debe empezar con https://)." };
  }
  if (/^sb_secret_/.test(keyLimpia) || /service_role/.test(keyLimpia)) {
    return { ok: false, error: "Se configuró una clave secreta de Supabase. La app solo debe usar la clave publishable." };
  }
  return { ok: true, config: { url: urlLimpia, key: keyLimpia } };
}
