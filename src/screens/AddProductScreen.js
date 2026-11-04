import { useCallback, useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { ProductForm } from "../components/ProductForm";
import { ESTADOS } from "../constants/estados";
import { useAuth } from "../context/AuthContext";
import { getEquipo, getNextEquipoId, saveEquipo } from "../services/supabaseData";
import { useTheme } from "../theme/useTheme";

const CARGANDO = "Cargando...";

export function AddProductScreen({ navigation }) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const [idQr, setIdQr] = useState(CARGANDO);
  const [idProvisional, setIdProvisional] = useState(false);
  const [idError, setIdError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pide el ID a Supabase; el estado solo cambia cuando llega la respuesta.
  const cargarId = useCallback(
    () =>
      getNextEquipoId().then(
        ({ id, provisional }) => {
          setIdQr(id);
          setIdProvisional(provisional);
          setIdError(null);
        },
        (error) => {
          console.error("No se pudo generar el ID del equipo:", error);
          setIdQr("");
          setIdError("No se pudo generar el ID. Toca para reintentar.");
        }
      ),
    []
  );

  useEffect(() => {
    cargarId();
  }, [cargarId]);

  const reintentarId = () => {
    setIdQr(CARGANDO);
    setIdError(null);
    cargarId();
  };

  const idListo = Boolean(idQr) && idQr !== CARGANDO;

  const handleSave = async (valores) => {
    if (!idListo) {
      Alert.alert("Error", "Espera a que se genere el ID del equipo.");
      return;
    }
    setLoading(true);
    try {
      if (await getEquipo(idQr)) {
        Alert.alert("Error", "Ya existe un equipo registrado con este ID.");
        return;
      }
      await saveEquipo(idQr, {
        ...valores,
        id_qr: idQr,
        estado: ESTADOS.DISPONIBLE,
        isTemplate: false,
        fecha_registro: new Date().toISOString(),
        personal_registro: userData?.nombre || "Admin",
      });
      Alert.alert("¡Éxito!", "Equipo agregado correctamente.");
      navigation.navigate("InventoryList");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const idNote = idError ? (
    <TouchableOpacity onPress={reintentarId}>
      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>{idError}</Text>
    </TouchableOpacity>
  ) : idProvisional ? (
    <Text style={{ color: colors.warning, fontSize: 12 }}>
      ⚠️ Sin conexión: este ID es provisional. Si otro dispositivo ya lo usó, se marcará como conflicto al
      sincronizar. No imprimas la etiqueta QR hasta que se sincronice.
    </Text>
  ) : null;

  return (
    <ProductForm
      title="Nuevo Equipo"
      idValue={idQr}
      idNote={idNote}
      submitLabel="GUARDAR EQUIPO"
      loading={loading}
      canSubmit={idListo}
      onSubmit={handleSave}
    />
  );
}
