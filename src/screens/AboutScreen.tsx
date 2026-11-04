import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import type { ComponentProps, ReactNode } from "react";
import { ScrollView, type StyleProp, Text, type TextStyle, View } from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

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

        <InfoCard icon="school" title="Proyecto de Titulación">
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, textAlign: "justify" }}>
            Este sistema fue desarrollado como proyecto oficial para la obtención del título profesional.
            Su propósito principal es optimizar el control, rastreo y gestión de activos físicos mediante
            el uso de tecnología de códigos QR, asegurando la integridad y disponibilidad de la información en tiempo real.
          </Text>
          <View style={{ height: 10 }} />
          <InfoField label="Institución:" value="Centro de Estudios Superiores del Bajio Qro. (CESBA)" />
          <InfoField label="Carrera:" value="Ingeniería en Sistemas Computacionales" />
        </InfoCard>

        <InfoCard icon="code-slash" title="Desarrollador">
          <InfoField label="Autor:" value="Ing. Ulises González Hernández" valueStyle={{ fontSize: 18, fontWeight: "bold" }} />
          <InfoField label="Contacto:" value="ulises.dev.hdz@gmail.com" valueStyle={{ fontWeight: "normal" }} />
          <InfoField label="Tecnologías Principales:" value="React Native • Supabase • Expo" valueStyle={{ fontSize: 14, fontWeight: "normal" }} />
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
