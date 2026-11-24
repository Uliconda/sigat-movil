import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { type ReactNode, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EmptyState } from "../components/EmptyState";
import { EquipoCard } from "../components/EquipoCard";
import { canManage } from "../constants/roles";
import { SIGAT_WEB_REPORTES } from "../constants/web";
import { useAuth } from "../context/AuthContext";
import { useInventario } from "../hooks/useInventario";
import { BRAND } from "../theme/colors";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { FiltroEstado, StackParamList } from "../types";
import { buscarEquipos, sinPlantillas } from "../utils/carpetas";
import { contarPorEdificio, contarPorEstado, FILTROS_ESTADO, SIN_EDIFICIO } from "../utils/ubicacion";

const COLOR_ESTADO: Record<FiltroEstado, string> = {
  disponible: BRAND.success,
  prestado: BRAND.warning,
  vencido: BRAND.magenta,
  fuera: BRAND.neutral,
};

// Inicio: buscar un equipo (por texto o escaneando), ver todos y conteos rápidos
// del inventario. Los conteos se calculan en el teléfono, sin generar archivos.
export function InicioScreen({ navigation }: NativeStackScreenProps<StackParamList, "Inicio">) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const { equipos, ubicaciones, cargando, refrescando, refrescar } = useInventario();
  const [texto, setTexto] = useState("");
  const puedeAdministrar = canManage(userData);

  const reales = sinPlantillas(equipos);
  const porEstado = contarPorEstado(reales);
  const porEdificio = contarPorEdificio(reales, ubicaciones.edificios);
  const resultados = texto.trim() ? buscarEquipos(equipos, texto) : [];

  const abrirWeb = async () => {
    try {
      await Linking.openURL(SIGAT_WEB_REPORTES);
    } catch {
      Alert.alert("No se pudo abrir el navegador", `Abre ${SIGAT_WEB_REPORTES} desde tu navegador.`);
    }
  };

  const refreshControl = (
    <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
  );

  const tarjeta = (titulo: string, children: ReactNode) => (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: colors.divider }}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 12 }}>{titulo}</Text>
      {children}
    </View>
  );

  const resumen = (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}
        onPress={() => navigation.navigate("Listado", { titulo: "Todos los equipos" })}
        accessibilityRole="button"
      >
        <Ionicons name="list" size={24} color={colors.primary} style={{ marginRight: 12 }} />
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Ver todos los equipos</Text>
          <Text style={[styles.cardSubtitle, { color: colors.subText }]}>
            {cargando ? "Cargando…" : `${reales.length.toLocaleString("es-MX")} equipos · filtra por edificio, categoría o estado`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.subText} />
      </TouchableOpacity>

      {tarjeta(
        "Por estado",
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 }}>
          {FILTROS_ESTADO.map(({ clave, etiqueta }) => (
            <TouchableOpacity
              key={clave}
              onPress={() => navigation.navigate("Listado", { titulo: etiqueta, estado: clave })}
              accessibilityRole="button"
              accessibilityLabel={`${porEstado[clave]} ${etiqueta}`}
              style={{
                width: "50%",
                padding: 5,
              }}
            >
              <View style={{ borderLeftWidth: 4, borderLeftColor: COLOR_ESTADO[clave], backgroundColor: colors.inputBg, borderRadius: 8, padding: 10 }}>
                <Text style={{ color: COLOR_ESTADO[clave], fontSize: 24, fontWeight: "bold" }}>
                  {porEstado[clave].toLocaleString("es-MX")}
                </Text>
                <Text style={{ color: colors.subText, fontSize: 12 }}>
                  {clave === "vencido" ? "Préstamos vencidos (+48 h)" : etiqueta}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tarjeta(
        "Por edificio",
        porEdificio.length === 0 ? (
          <Text style={{ color: colors.subText }}>Aún no hay equipos registrados.</Text>
        ) : (
          porEdificio.map(({ nombre, cantidad }) => (
            <TouchableOpacity
              key={nombre}
              onPress={() => navigation.navigate("Edificio", { edificio: nombre })}
              accessibilityRole="button"
              accessibilityLabel={`${nombre}, ${cantidad} equipos`}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>{nombre === SIN_EDIFICIO ? "📦" : "🏢"}</Text>
              <Text style={{ flex: 1, color: nombre === SIN_EDIFICIO ? colors.subText : colors.text }}>{nombre}</Text>
              <Text style={{ color: colors.text, fontWeight: "bold", marginRight: 6 }}>{cantidad.toLocaleString("es-MX")}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.subText} />
            </TouchableOpacity>
          ))
        )
      )}

      {puedeAdministrar && (
        <TouchableOpacity
          onPress={abrirWeb}
          accessibilityRole="link"
          style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.primary }}
        >
          <Ionicons name="open-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.primary, fontWeight: "bold" }}>Ver reportes en SIGAT Web</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.searchContainer, { flex: 0, backgroundColor: colors.inputBg, borderColor: colors.divider, marginBottom: 10 }]}>
        <Ionicons name="search" size={20} color={colors.subText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar: nombre, ID, marca, serie o persona…"
          returnKeyType="search"
          autoCorrect={false}
          placeholderTextColor={colors.subText}
          value={texto}
          onChangeText={setTexto}
          accessibilityLabel="Buscar equipo"
        />
        {texto ? (
          <TouchableOpacity onPress={() => setTexto("")} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
            <Ionicons name="close-circle" size={22} color={colors.subText} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.bigOrangeButton, { flexDirection: "row", justifyContent: "center", marginTop: 0, paddingVertical: 18 }]}
        onPress={() => navigation.navigate("Scanner", { returnMode: false })}
        accessibilityRole="button"
      >
        <Ionicons name="qr-code-outline" size={22} color="white" style={{ marginRight: 10 }} />
        <Text style={styles.bigButtonText}>ESCANEAR EQUIPO</Text>
      </TouchableOpacity>

      {texto.trim() ? (
        <FlatList
          data={resultados}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EquipoCard item={item} onPress={() => navigation.navigate("Detalles", { item })} />}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Sin resultados"
              message={`Nada coincide con "${texto.trim()}". Puedes buscar por nombre, ID, marca, número de serie o persona.`}
            />
          }
        />
      ) : (
        resumen
      )}

      {puedeAdministrar && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddProduct")}
          accessibilityRole="button"
          accessibilityLabel="Agregar equipo"
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}
