import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  resolveOfflineConflict,
  subscribeSyncStatus,
  syncPendingChanges,
} from "../services/supabaseData";
import { BRAND } from "../theme/colors";
import type { SyncStatus } from "../types";

const mensajeDeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Separación sobre el botón flotante "+" (bottom 20 + alto 60 + margen).
const ESPACIO_SOBRE_FAB = 96;

// Píldora flotante que informa cambios pendientes, falta de conexión o conflictos.
// Respeta el área segura para no quedar bajo la barra de estado ni el indicador de inicio.
export function OfflineSyncBanner({ userId }: { userId: string }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    pending: 0,
    conflicts: 0,
    conflictItems: [],
    error: null,
  });
  const visible = !(status.online && status.pending === 0);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => subscribeSyncStatus(setStatus), []);

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [visible, anim]);

  if (!visible) return null;

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

  // Estado visual: color de acento, icono, título y detalle.
  const estado = !status.online
    ? {
        color: BRAND.warning,
        icon: "cloud-offline" as const,
        titulo: "Sin conexión",
        detalle: `${status.pending} cambio(s) guardado(s) en este teléfono`,
      }
    : status.conflicts
      ? {
          color: BRAND.danger,
          icon: "git-compare" as const,
          titulo: `${status.conflicts} conflicto(s)`,
          detalle: "Toca para revisar",
        }
      : status.error
        ? {
            color: BRAND.danger,
            icon: "alert-circle" as const,
            titulo: "Sincronización detenida",
            detalle: `${status.pending} pendiente(s) · Toca para reintentar`,
          }
        : {
            color: BRAND.primary,
            icon: null,
            titulo: "Sincronizando",
            detalle: `${status.pending} cambio(s)…`,
          };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "flex-end" }]}>
      <Animated.View
        style={{
          alignSelf: "center",
          marginBottom: insets.bottom + ESPACIO_SOBRE_FAB,
          maxWidth: "88%",
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${estado.titulo}. ${estado.detalle}`}
          style={styles.pill}
        >
          <View style={[styles.iconCircle, { backgroundColor: estado.color }]}>
            {estado.icon ? (
              <Ionicons name={estado.icon} size={16} color={BRAND.white} />
            ) : (
              <ActivityIndicator size="small" color={BRAND.white} />
            )}
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.titulo} numberOfLines={1}>{estado.titulo}</Text>
            <Text style={styles.detalle} numberOfLines={1}>{estado.detalle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(28,28,30,0.94)",
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { color: BRAND.white, fontSize: 13, fontWeight: "700" },
  detalle: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 },
});
