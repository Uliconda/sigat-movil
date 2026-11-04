#!/usr/bin/env node
// EAS lo ejecuta antes de compilar (script "eas-build-pre-install" en package.json).
// Detiene la compilación si faltan las variables de Supabase o si tienen los
// valores de ejemplo, en lugar de generar una APK que se cierra al abrir.
// También se puede ejecutar a mano: npm run check-env

const VARIABLES = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const errores = [];

for (const nombre of VARIABLES) {
  const valor = (process.env[nombre] ?? "").trim();
  if (!valor) errores.push(`${nombre} no está definida.`);
  else if (/[<>]/.test(valor)) errores.push(`${nombre} tiene un valor de ejemplo ("${valor}").`);
}

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
if (url && !/[<>]/.test(url) && !/^https?:\/\/\S+$/.test(url)) {
  errores.push("EXPO_PUBLIC_SUPABASE_URL no es una URL válida.");
}
const key = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
if (/^sb_secret_/.test(key) || /service_role/.test(key)) {
  errores.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY es una clave secreta; usa la clave publishable.");
}

if (errores.length) {
  const entorno = process.env.EAS_BUILD_PROFILE ? ` (perfil "${process.env.EAS_BUILD_PROFILE}")` : "";
  console.error(`\n✘ Configuración de Supabase inválida${entorno}:`);
  errores.forEach((error) => console.error(`  - ${error}`));
  console.error("\nRegistra los valores reales en EAS, por ejemplo:");
  console.error("  eas env:push --environment preview --path .env\n");
  process.exit(1);
}

console.log("✔ Variables de Supabase configuradas.");
