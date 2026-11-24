import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  applyRemoteChange,
  getCarpetas,
  getCarpetasLocal,
  getEquipos,
  getEquiposLocal,
  getUbicaciones,
  getUbicacionesLocal,
  syncPendingChanges,
} from "../services/supabaseData";
import type { Carpeta, Equipo, Ubicaciones } from "../types";

export interface InventarioValue {
  equipos: Equipo[];
  carpetas: Carpeta[];
  ubicaciones: Ubicaciones;
  /** Primera carga (sin datos en el teléfono todavía). */
  cargando: boolean;
  /** Refresco manual (deslizar hacia abajo). */
  refrescando: boolean;
  recargar: () => Promise<void>;
  refrescar: () => Promise<void>;
  /** Vuelve a leer lo guardado en el teléfono (p. ej. al volver a una pantalla). */
  recargarLocal: () => Promise<void>;
}

const InventarioContext = createContext<InventarioValue | null>(null);

// Reemplaza un equipo de la lista, lo agrega si es nuevo o lo quita si es null.
function reemplazarEquipo(lista: Equipo[], id: string, equipo: Equipo | null): Equipo[] {
  if (!equipo) return lista.filter((item) => item.id !== id);
  return lista.some((item) => item.id === id)
    ? lista.map((item) => (item.id === id ? equipo : item))
    : [...lista, equipo];
}

// Inventario en vivo, compartido por todas las pestañas: un solo canal en tiempo
// real y una sola descarga, en lugar de una por pantalla. Muestra al instante lo
// guardado en el teléfono, descarga de Supabase al conectar y aplica cada cambio.
export function InventarioProvider({ children }: { children: ReactNode }) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicaciones>({ edificios: [], espacios: [], areas: [] });
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const recargarCarpetas = useCallback(async () => {
    try {
      setCarpetas(await getCarpetas());
    } catch (e) {
      console.log("Error cargando carpetas:", e);
    }
  }, []);

  const recargarUbicaciones = useCallback(async () => {
    try {
      setUbicaciones(await getUbicaciones());
    } catch (e) {
      console.log("Error cargando edificios:", e);
    }
  }, []);

  // Descarga completa desde Supabase (con respaldo en caché si no hay conexión).
  const recargar = useCallback(async () => {
    try {
      const [listaEquipos] = await Promise.all([getEquipos(), recargarCarpetas(), recargarUbicaciones()]);
      setEquipos(listaEquipos);
    } catch (e) {
      console.log("Error cargando equipos:", e);
    } finally {
      setCargando(false);
    }
  }, [recargarCarpetas, recargarUbicaciones]);

  // Deslizar hacia abajo: envía los cambios pendientes y vuelve a descargar.
  const refrescar = useCallback(async () => {
    setRefrescando(true);
    try {
      await syncPendingChanges().catch((e: unknown) => console.log("No se pudo sincronizar:", e));
      await recargar();
    } finally {
      setRefrescando(false);
    }
  }, [recargar]);

  // Lectura instantánea desde el teléfono (caché + cambios pendientes), sin red.
  const recargarLocal = useCallback(
    () =>
      Promise.all([getEquiposLocal(), getCarpetasLocal(), getUbicacionesLocal()]).then(
        ([listaEquipos, listaCarpetas, listaUbicaciones]) => {
          setEquipos(listaEquipos);
          setCarpetas(listaCarpetas);
          setUbicaciones(listaUbicaciones);
          // Si ya hay datos guardados se muestran sin esperar a la red.
          if (listaEquipos.length > 0) setCargando(false);
        },
        (e) => console.log("Error cargando equipos locales:", e)
      ),
    []
  );

  useEffect(() => {
    let active = true;
    void recargarLocal();

    const channel = supabase
      .channel(`mobile-equipos-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "equipos" }, async (payload) => {
        try {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          const { id, equipo } = await applyRemoteChange(payload.eventType, row);
          if (active && id) setEquipos((prev) => reemplazarEquipo(prev, id, equipo));
        } catch (error) {
          console.error("No se pudo aplicar un cambio en tiempo real:", error);
          if (active) void recargar();
        }
      })
      // Las tablas de carpetas y edificios son pequeñas: ante cualquier cambio se vuelven a leer.
      .on("postgres_changes", { event: "*", schema: "public", table: "carpetas" }, () => {
        if (active) void recargarCarpetas();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "edificios" }, () => {
        if (active) void recargarUbicaciones();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "espacios" }, () => {
        if (active) void recargarUbicaciones();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "areas" }, () => {
        if (active) void recargarUbicaciones();
      })
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          if (active) void recargar();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Error en cambios de inventario en tiempo real:", error);
          // Sin tiempo real, al menos se descarga el inventario una vez.
          if (active) void recargar();
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [recargar, recargarCarpetas, recargarUbicaciones, recargarLocal]);

  const value = useMemo(
    () => ({ equipos, carpetas, ubicaciones, cargando, refrescando, recargar, refrescar, recargarLocal }),
    [equipos, carpetas, ubicaciones, cargando, refrescando, recargar, refrescar, recargarLocal]
  );

  return <InventarioContext.Provider value={value}>{children}</InventarioContext.Provider>;
}

export function useInventarioContext(): InventarioValue {
  const value = useContext(InventarioContext);
  if (!value) throw new Error("useInventario debe usarse dentro de <InventarioProvider>.");
  return value;
}
