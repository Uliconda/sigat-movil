import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { getPersonal, getPersonalLocal } from "../services/personalData";
import { supabase } from "../services/supabaseClient";
import { getEquiposLocal } from "../services/supabaseData";
import type { Equipo, Personal } from "../types";

// Lista de personal administrativo en vivo + inventario guardado en el teléfono
// (para saber qué equipo tiene cada quien, también sin conexión).
export function usePersonal() {
  const navigation = useNavigation();
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargarLocal = useCallback(
    () =>
      Promise.all([getPersonalLocal(), getEquiposLocal()]).then(
        ([lista, inventario]) => {
          setPersonal(lista);
          setEquipos(inventario);
          if (lista.length > 0) setCargando(false);
        },
        (e) => console.log("Error cargando personal local:", e)
      ),
    []
  );

  const recargar = useCallback(async () => {
    try {
      const [lista, inventario] = await Promise.all([getPersonal(), getEquiposLocal()]);
      setPersonal(lista);
      setEquipos(inventario);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCargando(false);
    }
  }, []);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    try {
      await recargar();
    } finally {
      setRefrescando(false);
    }
  }, [recargar]);

  useEffect(() => {
    let active = true;
    recargarLocal();
    const unsubscribe = navigation.addListener("focus", () => void recargarLocal());

    // La tabla es pequeña: ante cualquier cambio se vuelve a leer completa.
    const channel = supabase
      .channel(`mobile-personal-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_administrativo" }, () => {
        if (active) void recargar();
      })
      .subscribe((status) => {
        // Al conectar (o si falla el tiempo real) se descarga la lista una vez.
        if (active && status !== "CLOSED") void recargar();
      });

    return () => {
      active = false;
      unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [navigation, recargar, recargarLocal]);

  return { personal, equipos, cargando, refrescando, refrescar, error };
}
