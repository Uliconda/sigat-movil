import { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import {
  resolveOfflineConflict,
  subscribeSyncStatus,
  syncPendingChanges,
} from "../services/supabaseData";
import type { SyncStatus } from "../types";

const mensajeDeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Franja superior que informa cambios pendientes, falta de conexión o conflictos.
export function OfflineSyncBanner({ userId }: { userId: string }) {
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    pending: 0,
    conflicts: 0,
    conflictItems: [],
    error: null,
  });

  useEffect(() => subscribeSyncStatus(setStatus), []);

  if (status.online && status.pending === 0) return null;

  const handlePress = async () => {
    if (status.conflictItems?.length) {
      const conflict = status.conflictItems[0];
      Alert.alert(
        "Cambio pendiente en conflicto",
        `El equipo ${conflict.equipoId} cambió en otro dispositivo. Aplicar los cambios locales puede reemplazar algunos campos remotos; conservar Supabase descarta los cambios y el historial pendientes de este equipo.`,
        [
          {
            text: "Conservar Supabase",
            style: "destructive",
            onPress: async () => {
              try {
                await resolveOfflineConflict(userId, conflict.id, "keep-server");
                await syncPendingChanges(userId, true);
              } catch (error) {
                Alert.alert("No se pudo resolver", mensajeDeError(error));
              }
            },
          },
          {
            text: "Aplicar mis cambios",
            onPress: async () => {
              try {
                await resolveOfflineConflict(userId, conflict.id, "keep-local");
              } catch (error) {
                Alert.alert("No se pudo resolver", mensajeDeError(error));
              }
            },
          },
          { text: "Después", style: "cancel" },
        ]
      );
      return;
    }

    if (!status.online) {
      Alert.alert("Sin conexión", "Los cambios se conservan en este teléfono y se enviarán al recuperar conexión con Supabase.");
      return;
    }
    if (status.error) {
      Alert.alert("Error de sincronización", status.error, [
        { text: "Después", style: "cancel" },
        {
          text: "Reintentar",
          onPress: () => {
            void syncPendingChanges(userId, true).catch((error: unknown) => {
              Alert.alert("No se pudo sincronizar", mensajeDeError(error));
            });
          },
        },
      ]);
      return;
    }
    try {
      await syncPendingChanges(userId, true);
    } catch (error) {
      Alert.alert("No se pudo sincronizar", mensajeDeError(error) || "Intenta de nuevo cuando Supabase esté disponible.");
    }
  };

  const message = !status.online
    ? `Sin conexión · ${status.pending} cambio(s) guardado(s) en este teléfono`
    : status.conflicts
      ? `${status.conflicts} conflicto(s) requieren revisión`
      : status.error
        ? `Sincronización detenida · ${status.pending} pendiente(s)`
        : `Sincronizando ${status.pending} cambio(s)…`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole="button"
      style={{
        backgroundColor: status.conflicts || status.error ? "#8E2A2A" : "#6B4A00",
        paddingVertical: 8,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ color: "#fff", textAlign: "center", fontSize: 12, fontWeight: "600" }}>
        {message}
      </Text>
    </TouchableOpacity>
  );
}
