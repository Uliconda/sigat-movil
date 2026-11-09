import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, RefreshControl, SectionList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { usePersonal } from "../hooks/usePersonal";
import { eliminarPersonal } from "../services/personalData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { Personal, PersonalStackParamList } from "../types";
import {
  agruparPorDepartamento,
  buscarPersonal,
  colorConducta,
  equiposDePersona,
  estaActivo,
} from "../utils/personal";

export function PersonalListScreen({ navigation }: NativeStackScreenProps<PersonalStackParamList, "PersonalList">) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const { personal, equipos, cargando, refrescando, refrescar, error } = usePersonal();
  const [busqueda, setBusqueda] = useState("");
  const [verBajas, setVerBajas] = useState(false);

  const resultados = useMemo(() => {
    const filtrados = buscarPersonal(personal, busqueda);
    // Al buscar se incluye a quien ya dejó de laborar; sin búsqueda, según el filtro.
    return busqueda.trim() || verBajas ? filtrados : filtrados.filter((p) => estaActivo(p));
  }, [personal, busqueda, verBajas]);
  const secciones = useMemo(() => agruparPorDepartamento(resultados), [resultados]);
  const totalBajas = personal.filter((p) => !estaActivo(p)).length;

  // Mantener presionado: opción de eliminar para siempre (solo administradores).
  const opciones = (persona: Personal) => {
    if (!canManage(userData)) return;
    Alert.alert("Opciones", persona.nombre, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar para siempre", style: "destructive", onPress: () => confirmarEliminar(persona) },
    ]);
  };

  const confirmarEliminar = (persona: Personal) => {
    const asignados = equiposDePersona(equipos, persona.id);
    if (asignados.length > 0) {
      Alert.alert(
        "Tiene equipo asignado",
        `${persona.nombre} todavía tiene: ${asignados.map((e) => e.id).join(", ")}.

Devuelve el equipo antes de eliminar a la persona.`
      );
      return;
    }
    Alert.alert(
      "⚠️ Eliminar para siempre",
      `¿Seguro que deseas eliminar a "${persona.nombre}"?

Se borrarán sus datos y su historial de equipos en Supabase. Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            eliminarPersonal(persona.id).then(
              () => {
                Alert.alert("¡Listo!", `"${persona.nombre}" fue eliminado.`);
                void refrescar();
              },
              (e: unknown) => Alert.alert("No se eliminó", e instanceof Error ? e.message : String(e))
            );
          },
        },
      ]
    );
  };

  const vacio = () => {
    if (cargando) return <EmptyState loading title="Cargando personal..." />;
    if (error && personal.length === 0) return <EmptyState icon="alert-circle-outline" title="No se pudo cargar" message={error} />;
    if (busqueda.trim()) {
      return <EmptyState icon="search-outline" title="Sin resultados" message={`Nadie coincide con "${busqueda.trim()}".`} />;
    }
    return (
      <EmptyState
        icon="people-outline"
        title="Aún no hay personal registrado"
        message={canManage(userData) ? "Toca + para dar de alta a la primera persona." : undefined}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 15, paddingBottom: 5 }}>
        <View style={[styles.searchContainer, { flex: 0, backgroundColor: colors.inputBg, borderColor: colors.divider }]}>
          <Ionicons name="search" size={20} color={colors.subText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar por nombre o departamento"
            placeholderTextColor={colors.placeholder}
            returnKeyType="search"
            autoCorrect={false}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => setBusqueda("")} accessibilityLabel="Borrar búsqueda">
              <Ionicons name="close-circle" size={20} color={colors.subText} />
            </TouchableOpacity>
          ) : null}
        </View>
        {totalBajas > 0 && !busqueda.trim() ? (
          <TouchableOpacity
            onPress={() => setVerBajas((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: verBajas }}
          >
            <Ionicons name={verBajas ? "checkbox" : "square-outline"} size={20} color={colors.primary} />
            <Text style={{ color: colors.subText, marginLeft: 6 }}>
              Mostrar personal que ya no labora ({totalBajas})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <SectionList
        sections={secciones}
        keyExtractor={(p) => p.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.subText, marginTop: 10, marginBottom: 8 }]}>
            {section.titulo.toUpperCase()} ({section.data.length})
          </Text>
        )}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: 15, paddingTop: 10 }]}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} />}
        ListEmptyComponent={vacio}
        renderItem={({ item }) => {
          const activo = estaActivo(item);
          const cantidad = equiposDePersona(equipos, item.id).length;
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider, opacity: activo ? 1 : 0.7 }]}
              onPress={() => navigation.navigate("PersonalDetalle", { personalId: item.id })}
              onLongPress={() => opciones(item)}
              accessibilityRole="button"
              accessibilityHint={canManage(userData) ? "Mantén presionado para ver más opciones" : undefined}
            >
              <View style={[styles.cardIndicator, { backgroundColor: activo ? colorConducta(item.conducta) : colors.neutral }]} />
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[styles.cardStatus, { color: activo ? colors.primary : colors.subText }]}>
                  {activo
                    ? cantidad === 0
                      ? "SIN EQUIPO ASIGNADO"
                      : `${cantidad} EQUIPO${cantidad === 1 ? "" : "S"} ASIGNADO${cantidad === 1 ? "" : "S"}`
                    : "YA NO LABORA"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subText} />
            </TouchableOpacity>
          );
        }}
      />

      {canManage(userData) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("PersonalForm")}
          accessibilityRole="button"
          accessibilityLabel="Dar de alta personal"
        >
          <Ionicons name="person-add" size={26} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
