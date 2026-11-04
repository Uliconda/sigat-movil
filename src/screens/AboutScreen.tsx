import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { ScrollView, type StyleProp, Text, type TextStyle, View } from "react-native";
import { getEstadoInfo } from "../constants/estados";
import { getCarpetasLocal, getEquiposLocal } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import { buildInventoryTree, sinPlantillas } from "../utils/carpetas";

interface Estadisticas {
  equipos: number;
  categorias: number;
  prestados: number;
}

// Cifras reales del inventario guardado en el teléfono (no requiere conexión).
function useEstadisticas(): Estadisticas | null {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([getEquiposLocal(), getCarpetasLocal()])
      .then(([equipos, carpetas]) => {
        if (!active) return;
        const reales = sinPlantillas(equipos);
        setEstadisticas({
          equipos: reales.length,
          categorias: Object.keys(buildInventoryTree(carpetas, reales)).length,
          prestados: reales.filter((e) => {
            const info = getEstadoInfo(e.estado);
            return info.isPrestado || info.isNoResponde;
          }).length,
        });
      })
      .catch((error: unknown) => console.log("No se pudieron calcular las estadísticas:", error));
    return () => {
      active = false;
    };
  }, []);
  return estadisticas;
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center" }} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={{ color: colors.primary, fontSize: 26, fontWeight: "bold" }}>{value.toLocaleString("es-MX")}</Text>
      <Text style={{ color: colors.subText, fontSize: 12, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function InfoCard({ icon, title, children }: { icon: ComponentProps<typeof Ionicons>["name"]; title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 15, borderRadius: 10, marginBottom: 15 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 15 }}>
        <Ionicons name={icon} size={24} color={colors.primary} style={{ marginRight: 10 }} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoField({ label, value, valueStyle }: { label: string; value: string; valueStyle?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.label, { color: colors.subText, fontWeight: "bold" }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text, fontWeight: "500", marginBottom: 10 }, valueStyle]}>{value}</Text>
    </>
  );
}

export function AboutScreen() {
  const { colors } = useTheme();
  const estadisticas = useEstadisticas();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 15 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginTop: 20, marginBottom: 30 }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 25,
              backgroundColor: colors.primary,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 15,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <Ionicons name="cube-outline" size={50} color="white" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text, marginBottom: 5 }]}>SIGAT</Text>
          <Text style={{ color: colors.subText, fontSize: 14, fontWeight: "500" }}>
            Versión {Constants.expoConfig?.version ?? "—"}
          </Text>
        </View>

        <InfoCard icon="business" title="Sistema de Gestión de Activos">
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
            SIGAT es el sistema con el que CESBA controla su inventario de equipo: registro de activos,
            préstamos y devoluciones mediante códigos QR, y evaluación del estado físico de cada equipo
            al recibirlo.
          </Text>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 10 }}>
            La app funciona sin conexión y se sincroniza en tiempo real con SIGAT Web, el panel de
            administración y reportes.
          </Text>
          <View style={{ height: 10 }} />
          <InfoField label="Institución:" value="Centro de Estudios Superiores del Bajío Qro. (CESBA)" />

          {estadisticas && (
            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                paddingTop: 15,
                borderTopWidth: 1,
                borderTopColor: colors.divider,
              }}
            >
              <Stat value={estadisticas.equipos} label="equipos registrados" />
              <Stat value={estadisticas.categorias} label="categorías" />
              <Stat value={estadisticas.prestados} label="en préstamo ahora" />
            </View>
          )}
        </InfoCard>

        <InfoCard icon="code-slash" title="Desarrollador">
          <InfoField label="Autor:" value="Ing. Ulises González Hernández" valueStyle={{ fontSize: 18, fontWeight: "bold" }} />
          <InfoField label="Contacto:" value="ulises.dev.hdz@gmail.com" valueStyle={{ fontWeight: "normal" }} />
          <InfoField label="Tecnologías Principales:" value="React Native • TypeScript • Expo • Supabase (PostgreSQL)" valueStyle={{ fontSize: 14, fontWeight: "normal" }} />
        </InfoCard>

        <View style={{ alignItems: "center", marginTop: 10, marginBottom: 20 }}>
          <Text style={{ color: colors.subText, fontSize: 12 }}>
            © {new Date().getFullYear()} Santiago de Querétaro, México.
          </Text>
          <Text style={{ color: colors.subText, fontSize: 12 }}>Todos los derechos reservados.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
