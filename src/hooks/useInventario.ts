import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  applyRemoteChange,
  getCarpetas,
  getCarpetasLocal,
  getEquipos,
  getEquiposLocal,
  syncPendingChanges,
} from "../services/supabaseData";
import type { Carpeta, Equipo } from "../types";

// Reemplaza un equipo de la lista, lo agrega si es nuevo o lo quita si es null.
function reemplazarEquipo(lista: Equipo[], id: string, equipo: Equipo | null): Equipo[] {
  if (!equipo) return lista.filter((item) => item.id !== id);
  return lista.some((item) => item.id === id)
    ? lista.map((item) => (item.id === id ? equipo : item))
    : [...lista, equipo];
}

// Inventario en vivo: muestra al instante lo guardado en el teléfono, descarga de
// Supabase al conectar el canal en tiempo real y aplica cada cambio que llegue.
export function useInventario() {
  const navigation = useNavigation();
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  // Primera carga (sin datos en el teléfono todavía) y refresco manual.
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const recargarCarpetas = useCallback(async () => {
    try {
      setCarpetas(await getCarpetas());
    } catch (e) {
      console.log("Error cargando carpetas:", e);
    }
  }, []);

  // Descarga completa desde Supabase (con respaldo en caché si no hay conexión).
  const recargar = useCallback(async () => {
    try {
      const [listaEquipos] = await Promise.all([getEquipos(), recargarCarpetas()]);
      setEquipos(listaEquipos);
    } catch (e) {
      console.log("Error cargando equipos:", e);
    } finally {
      setCargando(false);
    }
  }, [recargarCarpetas]);

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
      Promise.all([getEquiposLocal(), getCarpetasLocal()]).then(
        ([listaEquipos, listaCarpetas]) => {
          setEquipos(listaEquipos);
          setCarpetas(listaCarpetas);
          // Si ya hay datos guardados se muestran sin esperar a la red.
          if (listaEquipos.length > 0) setCargando(false);
        },
        (e) => console.log("Error cargando equipos locales:", e)
      ),
    []
  );

  useEffect(() => {
    let active = true;
    recargarLocal();
    const unsubscribe = navigation.addListener("focus", () => recargarLocal());

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
      // La tabla de carpetas es pequeña: ante cualquier cambio se vuelve a leer.
      .on("postgres_changes", { event: "*", schema: "public", table: "carpetas" }, () => {
        if (active) void recargarCarpetas();
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
      unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [navigation, recargar, recargarCarpetas, recargarLocal]);

  return { equipos, carpetas, recargar, cargando, refrescando, refrescar };
}
