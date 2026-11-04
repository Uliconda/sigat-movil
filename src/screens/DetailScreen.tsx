import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, type StyleProp, Text, type TextStyle, TouchableOpacity, View } from "react-native";
import { FormModal } from "../components/FormModal";
import { LabeledInput } from "../components/ThemedInput";
import { ESTADOS, getCondicionInfo, getEstadoInfo } from "../constants/estados";
import { canManage, isSuperadmin } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { deleteEquipo, getEquipo, updateEquipo } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { Equipo, MainStackParamList } from "../types";

type AccionMotivo = "BAJA" | "REACTIVAR";

interface FieldProps {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

interface AdminActionProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
}

const ORIGEN_APP = "Vía App Móvil 📱";

// Configuración de las acciones que piden un motivo para el historial.
const ACCIONES_MOTIVO = {
  BAJA: {
    titulo: "Dar de Baja Equipo",
    pregunta: "¿Por qué vas a dar de baja este equipo?",
    placeholder: "Ej. Pantalla rota, extraviado...",
    boton: "Dar de Baja",
    estado: ESTADOS.FUERA_DE_SERVICIO,
    accionHistorial: "BAJA",
    prefijo: "Baja del sistema",
  },
  REACTIVAR: {
    titulo: "Reactivar Equipo",
    pregunta: "¿Por qué se vuelve a activar este equipo?",
    placeholder: "Ej. Se reparó, pieza cambiada...",
    boton: "Reactivar",
    estado: ESTADOS.DISPONIBLE,
    accionHistorial: "REACTIVACIÓN",
    prefijo: "Equipo reactivado tras reparación",
  },
};

function Field({ label, value, valueStyle, labelStyle }: FieldProps) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.label, { color: colors.subText }, labelStyle]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }, valueStyle]}>{value}</Text>
    </>
  );
}

function AdminAction({ icon, label, color, onPress }: AdminActionProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.adminAction} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.adminActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DetailScreen({ route, navigation }: NativeStackScreenProps<MainStackParamList, "Detalles">) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const [item, setItem] = useState<Equipo>(route.params.item);
  const [loading, setLoading] = useState(false);

  // Modal de préstamo
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [nombreAlumno, setNombreAlumno] = useState("");
  const [matriculaAlumno, setMatriculaAlumno] = useState("");

  // Modal de motivo (baja / reactivación)
  const [reasonAction, setReasonAction] = useState<AccionMotivo | null>(null);
  const [reasonText, setReasonText] = useState("");

  const estado = getEstadoInfo(item.estado);
  const condicion = getCondicionInfo(item.condicion_fisica);
  const usuario = userData?.nombre || "Usuario Móvil";

  // Si la pantalla recibe un equipo nuevo (p. ej. al volver de Editar), se usa ese.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem(route.params.item);
  }, [route.params.item]);

  const refrescarDatos = useCallback(async () => {
    try {
      const equipo = await getEquipo(item.id);
      if (equipo) setItem(equipo);
    } catch (error) {
      console.error("Error al refrescar equipo:", error);
    }
  }, [item.id]);

  useEffect(() => navigation.addListener("focus", refrescarDatos), [navigation, refrescarDatos]);

  const handleConfirmarPrestamo = async () => {
    const nombre = nombreAlumno.trim();
    const matricula = matriculaAlumno.trim();
    if (!nombre || !matricula) {
      Alert.alert("Campos vacíos", "Por favor ingresa nombre y matrícula.");
      return;
    }
    setLoading(true);
    try {
      const changes = {
        estado: ESTADOS.PRESTADO,
        usuarioActual: usuario,
        alumno_nombre: nombre,
        alumno_matricula: matricula,
        poseedor_actual: `${nombre} (${matricula})`,
        fecha_prestamo: new Date().toISOString(),
      };
      await updateEquipo(item.id, changes, {
        idEquipo: item.id,
        nombreEquipo: item.nombre,
        accion: "PRÉSTAMO",
        fecha: new Date(),
        admin: userData?.nombre || "Usuario Desconocido",
        observaciones: `Prestado a: ${nombre} (${matricula}) - ${ORIGEN_APP}`,
      });

      setItem((prev) => ({ ...prev, ...changes }));
      setLoanModalVisible(false);
      setNombreAlumno("");
      setMatriculaAlumno("");
      Alert.alert("¡Éxito!", "El préstamo se guardó. Se sincronizará cuando haya conexión.");
    } catch {
      Alert.alert("Error", "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReasonAction = async () => {
    const motivo = reasonText.trim();
    if (!motivo) {
      Alert.alert("Campo vacío", "Por favor ingresa un motivo para el historial.");
      return;
    }
    if (!reasonAction) return;
    const accion = ACCIONES_MOTIVO[reasonAction];
    setLoading(true);
    try {
      const changes = {
        estado: accion.estado,
        usuarioActual: usuario,
        alumno_nombre: "",
        alumno_matricula: "",
        poseedor_actual: "",
      };
      await updateEquipo(item.id, changes, {
        idEquipo: item.id,
        nombreEquipo: item.nombre,
        accion: accion.accionHistorial,
        fecha: new Date(),
        admin: usuario,
        observaciones: `${accion.prefijo}. Motivo: ${motivo} - ${ORIGEN_APP}`,
      });

      setItem((prev) => ({ ...prev, ...changes }));
      setReasonAction(null);
      setReasonText("");
      Alert.alert("¡Éxito!", "El cambio se guardó y se sincronizará cuando haya conexión.");
    } catch {
      Alert.alert("Error", "Hubo un problema al actualizar el estado.");
    } finally {
      setLoading(false);
    }
  };

  const openReasonModal = (type: AccionMotivo) => {
    setReasonAction(type);
    setReasonText("");
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Equipo",
      `¿Estás seguro de que deseas eliminar permanentemente "${item.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEquipo(item.id);
              Alert.alert("Eliminado", "El equipo ha sido borrado del inventario.");
              navigation.navigate("InventoryList");
            } catch {
              Alert.alert("Error", "No se pudo eliminar el equipo.");
            }
          },
        },
      ],
    );
  };

  const handleDevolver = () => {
    Alert.alert(
      estado.isNoResponde ? "Recuperar Equipo" : "Confirmación",
      estado.isNoResponde
        ? "Vas a recibir un equipo marcado con falta. Por favor escanea el QR nuevamente para procesar el regreso."
        : "Para devolver, escanea el QR nuevamente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Escanear QR",
          onPress: () => navigation.navigate("Scanner", { returnMode: true, expectedId: item.id }),
        },
      ],
    );
  };

  const prestarLabel = estado.isFueraDeServicio
    ? "NO DISPONIBLE"
    : estado.isNoResponde
      ? "BLOQUEADO (FALTA)"
      : estado.isPrestado
        ? "OCUPADO"
        : "PRESTAR";

  const accionMotivo = reasonAction ? ACCIONES_MOTIVO[reasonAction] : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalles del Equipo</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
          <Field label="Nombre del Equipo" value={item.nombre ?? "Sin nombre"} valueStyle={styles.valueLarge} />
          <Field label="ID / Código" value={item.id} />
          <Field label="Categoría" value={item.categoria || "General"} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 15 }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Field label="Marca" value={item.marca || "No registrada"} labelStyle={{ marginTop: 0 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="No. de Serie" value={item.no_serie || "No registrado"} labelStyle={{ marginTop: 0 }} />
            </View>
          </View>

          <Field
            label="Estado Actual"
            value={estado.label}
            valueStyle={{ color: estado.color, fontWeight: "bold", textTransform: "uppercase" }}
          />
          <Field
            label="Condición Física (Último Retorno)"
            value={condicion.nota ? `${condicion.label} (${condicion.nota})` : condicion.label}
            valueStyle={{ color: condicion.color, fontWeight: "bold" }}
          />
          <Field label="Descripción" value={item.descripcion || "Sin descripción"} />

          {/* Se muestra quién lo tiene, incluso si "No responde", para saber a quién cobrar. */}
          {(estado.isPrestado || estado.isNoResponde) && (
            <>
              <Field
                label="Poseedor / Deudor:"
                value={item.alumno_nombre || item.poseedor_actual || "Sin datos"}
                valueStyle={styles.valueHighlight}
              />
              <Field label="Matrícula:" value={item.alumno_matricula || "-"} />
            </>
          )}

          {canManage(userData) && (
            <View style={[styles.adminActions, { borderTopColor: colors.border }]}>
              <AdminAction
                icon="pencil"
                label="EDITAR"
                color={colors.primary}
                onPress={() => navigation.navigate("EditProduct", { item })}
              />
              {estado.isFueraDeServicio ? (
                <AdminAction icon="checkmark-circle" label="REACTIVAR" color={colors.success} onPress={() => openReasonModal("REACTIVAR")} />
              ) : (
                <AdminAction icon="close-circle" label="BAJA" color={colors.warning} onPress={() => openReasonModal("BAJA")} />
              )}
              {isSuperadmin(userData) && (
                <AdminAction icon="trash" label="ELIMINAR" color={colors.danger} onPress={handleDelete} />
              )}
            </View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: estado.canPrestar ? colors.success : colors.disabled }]}
            disabled={!estado.canPrestar}
            onPress={() => setLoanModalVisible(true)}
          >
            <Text style={[styles.buttonText, { color: estado.canPrestar ? "white" : "#AAA" }]}>{prestarLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: estado.canDevolver ? colors.danger : colors.disabled }]}
            disabled={!estado.canDevolver}
            onPress={handleDevolver}
          >
            <Text style={[styles.buttonText, { color: estado.canDevolver ? "white" : "#AAA" }]}>
              {estado.isNoResponde ? "RECUPERAR" : "DEVOLVER"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("InventoryList")} style={{ alignSelf: "center", marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "bold" }}>VOLVER AL INICIO</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>

      <FormModal
        visible={loanModalVisible}
        animationType="slide"
        title="Datos del Alumno"
        subtitle="Ingresa quién recibe el equipo"
        onCancel={() => setLoanModalVisible(false)}
        onConfirm={handleConfirmarPrestamo}
        loading={loading}
      >
        <LabeledInput label="Nombre Completo:" placeholder="Ej. Juan Pérez" value={nombreAlumno} onChangeText={setNombreAlumno} />
        <LabeledInput
          label="Matrícula:"
          placeholder="Ej. 2314209"
          keyboardType="numeric"
          value={matriculaAlumno}
          onChangeText={setMatriculaAlumno}
        />
      </FormModal>

      <FormModal
        visible={accionMotivo !== null}
        title={accionMotivo?.titulo}
        subtitle={accionMotivo?.pregunta}
        confirmLabel={accionMotivo?.boton}
        confirmColor={reasonAction === "BAJA" ? colors.warning : colors.success}
        onCancel={() => setReasonAction(null)}
        onConfirm={handleConfirmReasonAction}
        loading={loading}
      >
        <LabeledInput
          label="Motivo u Observaciones:"
          placeholder={accionMotivo?.placeholder}
          multiline
          value={reasonText}
          onChangeText={setReasonText}
        />
      </FormModal>
    </View>
  );
}
