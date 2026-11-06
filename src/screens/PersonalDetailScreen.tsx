import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { getAsignacionesPersonal, getPersonal, getPersonalLocal } from "../services/personalData";
import { getEquiposLocal } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { Asignacion, Equipo, Personal, PersonalStackParamList } from "../types";
import {
  colorConducta,
  equiposDePersona,
  estaActivo,
  formatearFecha,
  formatearFechaHora,
} from "../utils/personal";

function Dato({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.label, { color: colors.subText }]}>{label}</Text>
      <Text style={[styles.value, { color: color ?? colors.text }, color ? { fontWeight: "bold" } : null]}>{value}</Text>
    </>
  );
}

export function PersonalDetailScreen({ route, navigation }: NativeStackScreenProps<PersonalStackParamList, "PersonalDetalle">) {
  const { personalId } = route.params;
  const { userData } = useAuth();
  const { colors } = useTheme();
  // undefined = cargando; null = no existe.
  const [persona, setPersona] = useState<Personal | null | undefined>(undefined);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [historial, setHistorial] = useState<Asignacion[] | null>(null);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    const [local, inventario] = await Promise.all([getPersonalLocal(), getEquiposLocal()]);
    const enTelefono = local.find((p) => p.id === personalId);
    if (enTelefono) setPersona(enTelefono);
    setEquipos(inventario);
    try {
      const [remoto, asignaciones] = await Promise.all([getPersonal(), getAsignacionesPersonal(personalId)]);
      setPersona(remoto.find((p) => p.id === personalId) ?? null);
      setHistorial(asignaciones);
      setErrorHistorial(null);
    } catch (e) {
      setErrorHistorial(e instanceof Error ? e.message : String(e));
      setHistorial((prev) => prev ?? []);
      setPersona((prev) => prev ?? enTelefono ?? null);
    }
  }, [personalId]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar])
  );

  const refrescar = async () => {
    setRefrescando(true);
    await cargar().finally(() => setRefrescando(false));
  };

  // Abre el equipo en el inventario (otra sección del menú).
  const abrirEquipo = (equipo: Equipo) =>
    navigation.getParent()?.navigate("Main", { screen: "Detalles", params: { item: equipo } });

  if (!persona) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        {persona === undefined ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={{ color: colors.subText }}>Esta persona ya no está registrada.</Text>
        )}
      </View>
    );
  }

  const activo = estaActivo(persona);
  const actuales = equiposDePersona(equipos, persona.id);
  const anteriores = (historial ?? []).filter((a) => a.fecha_fin);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} />}
    >
      <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.valueLarge, { color: colors.text }]}>{persona.nombre}</Text>
        <Text style={{ color: activo ? colors.success : colors.subText, fontWeight: "bold" }}>
          {activo ? "LABORANDO" : "YA NO LABORA EN LA INSTITUCIÓN"}
        </Text>
        <Dato label="Departamento" value={persona.departamento || "Sin registrar"} />
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1 }}>
            <Dato label="Fecha de ingreso" value={formatearFecha(persona.fecha_ingreso) || "Sin registrar"} />
          </View>
          <View style={{ flex: 1 }}>
            <Dato label="Fecha de término" value={formatearFecha(persona.fecha_termino) || "—"} />
          </View>
        </View>
        <Dato
          label="Conducta en el uso del equipo"
          value={persona.conducta || "Sin evaluar"}
          color={persona.conducta ? colorConducta(persona.conducta) : undefined}
        />
        {persona.conducta_notas ? <Text style={{ color: colors.subText }}>{persona.conducta_notas}</Text> : null}

        {canManage(userData) && (
          <View style={[styles.adminActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.adminAction}
              onPress={() => navigation.navigate("PersonalForm", { personalId: persona.id })}
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
              <Text style={[styles.adminActionText, { color: colors.primary }]}>EDITAR DATOS</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.subText, marginBottom: 10 }]}>
        EQUIPO ASIGNADO ACTUALMENTE ({actuales.length})
      </Text>
      {actuales.length === 0 ? (
        <Text style={{ color: colors.subText, marginBottom: 20 }}>No tiene equipo asignado.</Text>
      ) : (
        actuales.map((equipo) => (
          <TouchableOpacity
            key={equipo.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => abrirEquipo(equipo)}
            accessibilityRole="button"
          >
            <View style={[styles.cardIndicator, { backgroundColor: colors.primary }]} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{equipo.nombre || "Sin nombre"}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.subText }]}>
                {equipo.id}
                {equipo.no_serie ? ` · Serie ${equipo.no_serie}` : ""}
              </Text>
              {equipo.fecha_prestamo ? (
                <Text style={{ color: colors.subText, fontSize: 12 }}>Desde {formatearFechaHora(equipo.fecha_prestamo)}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.subText} />
          </TouchableOpacity>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: colors.subText, marginTop: 15, marginBottom: 10 }]}>
        HISTORIAL DE EQUIPOS ANTERIORES
      </Text>
      {historial === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : anteriores.length === 0 ? (
        <Text style={{ color: colors.subText }}>{errorHistorial ?? "Sin equipos anteriores registrados."}</Text>
      ) : (
        anteriores.map((a) => (
          <View key={a.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={[styles.cardIndicator, { backgroundColor: colors.neutral }]} />
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{a.equipo_nombre || a.equipo_id}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.subText }]}>{a.equipo_id}</Text>
              <Text style={{ color: colors.subText, fontSize: 12 }}>
                {formatearFechaHora(a.fecha_inicio)} → {formatearFechaHora(a.fecha_fin)}
              </Text>
              {a.condicion_devolucion ? (
                <Text style={{ color: colors.subText, fontSize: 12 }}>Devuelto en: {a.condicion_devolucion}</Text>
              ) : null}
              {a.observaciones ? <Text style={{ color: colors.subText, fontSize: 12 }}>{a.observaciones}</Text> : null}
            </View>
          </View>
        ))
      )}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
