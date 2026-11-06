import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { usePersonal } from "../hooks/usePersonal";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { PersonalStackParamList } from "../types";
import { buscarPersonal, colorConducta, equiposDePersona, estaActivo } from "../utils/personal";

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
  const totalBajas = personal.filter((p) => !estaActivo(p)).length;

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

      <FlatList
        data={resultados}
        keyExtractor={(p) => p.id}
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
              accessibilityRole="button"
            >
              <View style={[styles.cardIndicator, { backgroundColor: activo ? colorConducta(item.conducta) : colors.neutral }]} />
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.subText }]}>
                  {item.departamento || "Sin departamento"}
                </Text>
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
