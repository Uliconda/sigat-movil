// SIGAT Web: panel de administración y reportes PDF/Excel.
// Se puede cambiar por compilación con EXPO_PUBLIC_SIGAT_WEB_URL.
const URL_PREDETERMINADA = "https://sigat.cesba-queretaro.edu.mx";

export const SIGAT_WEB_URL = (process.env.EXPO_PUBLIC_SIGAT_WEB_URL || URL_PREDETERMINADA).replace(/\/+$/, "");

/** Página de reportes de la web (pide iniciar sesión si hace falta). */
export const SIGAT_WEB_REPORTES = `${SIGAT_WEB_URL}/reportes`;
