import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { CONDICIONES, ESTADOS } from "../constants/estados";
import { useAuth } from "../context/AuthContext";
import { getEquipo, updateEquipo } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { MainStackParamList } from "../types";

// Opciones de condición física al recibir un equipo.
const OPCIONES_CONDICION = [
  { value: CONDICIONES.BUEN_ESTADO, bg: "#e8f5e9", border: "#4caf50", text: "#1b5e20" },
  { value: CONDICIONES.ACEPTABLE, bg: "#fff8e1", border: "#ffb300", text: "#b78103", nota: "Falta poco para reemplazarlo" },
  { value: CONDICIONES.REEMPLAZAR, bg: "#ffebee", border: "#f44336", text: "#c62828" },
];

export function ScannerScreen({ route, navigation }: NativeStackScreenProps<MainStackParamList, "Scanner">) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  // Evita que la cámara siga activa cuando la pantalla no está visible.
  const isFocused = useIsFocused();
  const { returnMode, expectedId, mode } = route.params || {};
  const isProcessing = useRef(false);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [tempEquipoData, setTempEquipoData] = useState<{ id: string; nombre: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Sonido incluido en la app: funciona sin conexión y en iOS (que no reproduce .ogg).
  const player = useAudioPlayer(require("../../assets/sounds/beep.wav"));

  const playBeep = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.warn("No se pudo reproducir el sonido del escáner:", error);
    }
  };

  const liberarEscaner = () => {
    setScanned(false);
    isProcessing.current = false;
  };

  // Cada vez que la pantalla vuelve a estar activa, se liberan los candados.
  useEffect(() => {
    if (isFocused) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScanned(false);
      isProcessing.current = false;
    }
  }, [isFocused]);

  if (!permission) return <View style={[styles.container, { backgroundColor: colors.background }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={56} color={colors.primary} style={{ marginBottom: 15 }} />
        <Text style={{ color: colors.text, fontSize: 16, textAlign: "center", marginBottom: 20 }}>
          Necesitamos usar tu cámara para escanear los QR
        </Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.bigOrangeButton, { alignSelf: "stretch" }]}>
          <Text style={styles.bigButtonText}>DAR PERMISO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: colors.subText, fontWeight: "600" }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const procesarDevolucionEscaneada = async (data: string) => {
    if (data !== expectedId) {
      Vibration.vibrate();
      Alert.alert("⛔ Error", "El código escaneado no coincide con el equipo que intentas devolver.", [
        { text: "Reintentar", onPress: liberarEscaner },
      ]);
      return;
    }
    try {
      const equipo = await getEquipo(data);
      setTempEquipoData({ id: data, nombre: equipo?.nombre || "Desconocido" });
      setStatusModalVisible(true);
    } catch {
      Alert.alert("Error", "No se pudo conectar con la base de datos.");
      liberarEscaner();
    }
  };

  const buscarEquipo = async (data: string) => {
    try {
      const equipo = await getEquipo(data);
      if (equipo) {
        navigation.replace("Detalles", { item: equipo });
      } else {
        Alert.alert("⚠️ No encontrado", `No existe un equipo en el inventario con el ID: ${data}`, [
          { text: "OK", onPress: liberarEscaner },
        ]);
      }
    } catch {
      Alert.alert("Error", "No se pudo conectar con la base de datos.", [{ text: "OK", onPress: liberarEscaner }]);
    }
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);

    Vibration.vibrate(100);
    playBeep();

    if (mode === "add") {
      navigation.replace("AddProduct", { scannedId: data });
    } else if (returnMode) {
      await procesarDevolucionEscaneada(data);
    } else {
      await buscarEquipo(data);
    }
  };

  // Guarda la devolución con la condición física seleccionada.
  const procesarDevolucionConEstado = async (condicionFisica: string) => {
    if (!tempEquipoData) return;
    setGuardando(true);

    try {
      await updateEquipo(tempEquipoData.id, {
        estado: ESTADOS.DISPONIBLE,
        condicion_fisica: condicionFisica,
        usuarioActual: userData?.nombre || "Usuario Móvil",
        alumno_nombre: "",
        alumno_matricula: "",
        poseedor_actual: "",
      }, {
        idEquipo: tempEquipoData.id,
        nombreEquipo: tempEquipoData.nombre,
        accion: "DEVOLUCIÓN",
        fecha: new Date(),
        admin: userData?.nombre || "Usuario Desconocido",
        observaciones: `Devuelto escaneando QR. Condición física: ${condicionFisica} - Vía App Móvil 📱`,
      });

      setStatusModalVisible(false);
      setGuardando(false);
      Alert.alert("✅ Devolución guardada", "Se sincronizará cuando haya conexión.", [
        {
          text: "Terminar",
          onPress: () => {
            isProcessing.current = false;
            setTempEquipoData(null);
            navigation.goBack();
          },
        },
      ]);
    } catch {
      setGuardando(false);
      Alert.alert("Error", "No se pudo procesar la devolución. Intenta de nuevo.");
    }
  };

  const cancelarDevolucion = () => {
    setStatusModalVisible(false);
    setTempEquipoData(null);
    liberarEscaner();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
      )}

      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {mode === "add"
            ? "Escanea el nuevo QR"
            : returnMode
              ? `🔐 ESCANEA PARA DEVOLVER:\n${expectedId}`
              : "Escanea un QR para buscar"}
        </Text>
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityRole="button">
        <Text style={{ color: "white", fontWeight: "bold" }}>Cancelar</Text>
      </TouchableOpacity>

      <Modal animationType="fade" transparent visible={statusModalVisible} onRequestClose={cancelarDevolucion}>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} style={{ marginBottom: 10 }} />
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 10 }]}>Evaluación de Equipo</Text>
            <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
              ¿En qué estado físico se está devolviendo este equipo?
            </Text>

            {guardando ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <View style={{ width: "100%", gap: 12 }}>
                {OPCIONES_CONDICION.map((opcion) => (
                  <TouchableOpacity
                    key={opcion.value}
                    style={{
                      width: "100%",
                      backgroundColor: opcion.bg,
                      borderWidth: 1,
                      borderColor: opcion.border,
                      borderRadius: 12,
                      padding: 15,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                    onPress={() => procesarDevolucionConEstado(opcion.value)}
                    accessibilityRole="button"
                  >
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: opcion.border, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: opcion.text, fontWeight: "bold", fontSize: 16 }}>{opcion.value}</Text>
                      {opcion.nota ? <Text style={{ color: opcion.text, fontSize: 11 }}>{opcion.nota}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={{ width: "100%", marginTop: 10, padding: 12, alignItems: "center" }} onPress={cancelarDevolucion}>
                  <Text style={{ color: colors.subText, fontWeight: "600", fontSize: 15 }}>Cancelar devolución</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
