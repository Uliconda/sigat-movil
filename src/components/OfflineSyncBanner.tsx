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
// Se puede minimizar a una pestaña en el borde derecho para no tapar botones de la pantalla.
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
  const [minimizado, setMinimizado] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  // Un conflicto nuevo requiere atención: vuelve a mostrar la píldora completa.
  useEffect(() => {
    let conflictosPrevios = 0;
    return subscribeSyncStatus((nuevo) => {
      if (nuevo.conflicts > conflictosPrevios) setMinimizado(false);
      conflictosPrevios = nuevo.conflicts;
      setStatus(nuevo);
    });
  }, []);

  // Anima la entrada al aparecer y en cada cambio entre píldora y pestaña.
  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [visible, minimizado, anim]);

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

  const icono = estado.icon ? (
    <Ionicons name={estado.icon} size={16} color={BRAND.white} />
  ) : (
    <ActivityIndicator size="small" color={BRAND.white} />
  );

  if (minimizado) {
    return (
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: "center" }]}>
        <Animated.View
          style={{
            alignSelf: "flex-end",
            marginRight: insets.right,
            opacity: anim,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
          }}
        >
          <TouchableOpacity
            onPress={() => setMinimizado(false)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${estado.titulo}. Toca para mostrar el aviso de sincronización`}
            style={styles.pestana}
          >
            <Ionicons name="chevron-back" size={14} color="rgba(255,255,255,0.6)" />
            <View style={[styles.iconCircle, { backgroundColor: estado.color }]}>{icono}</View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

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
        <View style={styles.pill}>
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${estado.titulo}. ${estado.detalle}`}
            style={styles.pillContenido}
          >
            <View style={[styles.iconCircle, { backgroundColor: estado.color }]}>{icono}</View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.titulo} numberOfLines={1}>{estado.titulo}</Text>
              <Text style={styles.detalle} numberOfLines={1}>{estado.detalle}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.separador} />
          <TouchableOpacity
            onPress={() => setMinimizado(true)}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Minimizar aviso de sincronización"
            style={styles.botonMinimizar}
          >
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(28,28,30,0.94)",
    borderRadius: 28,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pillContenido: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  separador: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 10,
  },
  botonMinimizar: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
  // Pestaña pegada al borde derecho: solo las esquinas izquierdas redondeadas.
  pestana: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(28,28,30,0.94)",
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 0,
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
