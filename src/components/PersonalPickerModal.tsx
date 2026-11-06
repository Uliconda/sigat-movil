import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getPersonal, getPersonalLocal } from "../services/personalData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { Personal } from "../types";
import { buscarPersonal, estaActivo } from "../utils/personal";

interface PersonalPickerModalProps {
  visible: boolean;
  equipoNombre?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (persona: Personal) => void;
}

// Elige a quién del personal administrativo (que siga laborando) se le asigna el equipo.
// Usa la lista guardada en el teléfono, así que también funciona sin conexión.
export function PersonalPickerModal({ visible, equipoNombre, loading = false, onCancel, onConfirm }: PersonalPickerModalProps) {
  const { colors } = useTheme();
  const [personal, setPersonal] = useState<Personal[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [elegida, setElegida] = useState<Personal | null>(null);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void getPersonalLocal().then((lista) => active && setPersonal(lista));
    void getPersonal()
      .then((lista) => active && setPersonal(lista))
      .catch(() => active && setPersonal((prev) => prev ?? []));
    return () => {
      active = false;
      setBusqueda("");
      setElegida(null);
    };
  }, [visible]);

  const resultados = useMemo(
    () => buscarPersonal((personal ?? []).filter((p) => estaActivo(p)), busqueda),
    [personal, busqueda]
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalView, { backgroundColor: colors.card, maxHeight: "85%", alignItems: "stretch" }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Asignar a personal</Text>
          <Text style={[styles.modalSubtitle, { color: colors.subText }]}>
            {equipoNombre ? `¿Quién recibe "${equipoNombre}"?` : "¿Quién recibe el equipo?"}
          </Text>

          <View style={[styles.searchContainer, { flex: 0, backgroundColor: colors.inputBg, borderColor: colors.divider, marginBottom: 10 }]}>
            <Ionicons name="search" size={18} color={colors.subText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar nombre o departamento"
              placeholderTextColor={colors.placeholder}
              autoCorrect={false}
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

          {personal === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={resultados}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0, maxHeight: 320 }}
              ListEmptyComponent={
                <Text style={{ color: colors.subText, textAlign: "center", marginVertical: 20 }}>
                  {personal.length === 0
                    ? "No hay personal dado de alta. Regístralo en el menú › Personal administrativo."
                    : "Nadie coincide con la búsqueda."}
                </Text>
              }
              renderItem={({ item }) => {
                const seleccionada = elegida?.id === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => setElegida(item)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: seleccionada }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 6,
                      borderWidth: 1.5,
                      borderColor: seleccionada ? colors.primary : colors.divider,
                    }}
                  >
                    <Ionicons
                      name={seleccionada ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={seleccionada ? colors.primary : colors.subText}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "bold" }}>{item.nombre}</Text>
                      <Text style={{ color: colors.subText, fontSize: 12 }}>{item.departamento || "Sin departamento"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.disabled }]} onPress={onCancel} disabled={loading}>
              <Text style={styles.textStyle}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: elegida ? colors.success : colors.disabled }]}
              onPress={() => elegida && onConfirm(elegida)}
              disabled={!elegida || loading}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textStyle}>Asignar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
