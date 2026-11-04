import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validateSupabaseConfig } from "./supabaseConfig";

// Las variables EXPO_PUBLIC_* se incrustan al compilar: en Expo Go vienen del
// archivo .env y en las compilaciones de EAS, de las variables del entorno.
const resultado = validateSupabaseConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

/** Motivo por el que no se puede conectar a Supabase, o null si todo está bien. */
export const supabaseConfigError: string | null = resultado.ok ? null : resultado.error;

if (supabaseConfigError) {
  console.error(`Configuración de Supabase inválida: ${supabaseConfigError}`);
}

// Si la configuración es inválida no se crea el cliente: index.ts muestra la
// pantalla de configuración y la app nunca llega a usarlo.
export const supabase: SupabaseClient = resultado.ok
  ? createClient(resultado.config.url, resultado.config.key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient);
