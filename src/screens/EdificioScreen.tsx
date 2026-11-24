import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { FolderCard } from "../components/FolderCard";
import { getCategoriaConfig } from "../constants/categorias";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { useInventario } from "../hooks/useInventario";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { StackParamList } from "../types";
import { categoriaDe, contarPor, contarPorEstado, espacioDe, filtrarEquipos, SIN_EDIFICIO, SIN_ESPACIO } from "../utils/ubicacion";

// Un edificio: sus espacios (del catálogo, aunque estén vacíos, para poder
// agregar equipos ahí) y sus categorías (solo las que tienen equipos). Un
// espacio abre su lista con chips de departamento / área; desde ahí el botón +
// agrega el equipo con edificio, espacio y área ya definidos.
export function EdificioScreen({ route, navigation }: NativeStackScreenProps<StackParamList, "Edificio">) {
  const { edificio } = route.params;
  const { userData } = useAuth();
  const { colors } = useTheme();
  const { equipos, ubicaciones, cargando, refrescando, refrescar } = useInventario();

  const delEdificio = filtrarEquipos(equipos, { edificio });
  const categorias = contarPor(delEdificio, categoriaDe);
  const estados = contarPorEstado(delEdificio);
  const edificioId = ubicaciones.edificios.find((e) => e.nombre === edificio)?.id;
  const catalogo = ubicaciones.espacios.filter((s) => s.edificio_id === edificioId);
  const espacios = contarPor(delEdificio, espacioDe, catalogo.map((s) => s.nombre));
  const areasDe = (nombre: string) => {
    const id = catalogo.find((s) => s.nombre === nombre)?.id;
    return id ? ubicaciones.areas.filter((a) => a.espacio_id === id).length : 0;
  };
  const puedeAgregar = canManage(userData) && edificio !== SIN_EDIFICIO;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={categorias}
        keyExtractor={(c) => c.nombre}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            {delEdificio.length > 0 && (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider, marginHorizontal: 8 }]}
                onPress={() => navigation.navigate("Listado", { titulo: edificio, edificio })}
                accessibilityRole="button"
              >
                <Ionicons name="list" size={22} color={colors.primary} style={{ marginRight: 12 }} />
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {delEdificio.length.toLocaleString("es-MX")} equipos en total
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.subText }]}>
                    {estados.prestado} prestados · {estados.vencido} vencidos · {estados.fuera} fuera de servicio
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.subText} />
              </TouchableOpacity>
            )}

            {espacios.length > 0 && (
              <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 15, marginHorizontal: 8, marginBottom: 15, borderWidth: 1, borderColor: colors.divider }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>Espacios</Text>
                {espacios.map(({ nombre, cantidad }) => {
                  const areas = areasDe(nombre);
                  return (
                    <TouchableOpacity
                      key={nombre}
                      onPress={() => navigation.navigate("Listado", { titulo: `${edificio} › ${nombre}`, edificio, espacio: nombre })}
                      accessibilityRole="button"
                      accessibilityLabel={`${nombre}, ${cantidad} equipos`}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 8 }}>{nombre === SIN_ESPACIO ? "📦" : "🚪"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: nombre === SIN_ESPACIO ? colors.subText : colors.text }}>{nombre}</Text>
                        {areas > 0 && (
                          <Text style={{ color: colors.subText, fontSize: 12 }}>
                            {areas} {areas === 1 ? "departamento / área" : "departamentos / áreas"}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: colors.text, fontWeight: "bold", marginRight: 6 }}>{cantidad.toLocaleString("es-MX")}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.subText} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {categorias.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 8, marginBottom: 8 }]}>Categorías</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const config = getCategoriaConfig(item.nombre);
          return (
            <FolderCard
              nombre={item.nombre}
              cantidad={item.cantidad}
              icon={config.icon}
              color={config.color}
              borderColor={config.color}
              onPress={() =>
                navigation.navigate("Listado", { titulo: `${item.nombre} · ${edificio}`, edificio, categoria: item.nombre })
              }
            />
          );
        }}
        ListEmptyComponent={
          cargando ? (
            <EmptyState loading title="Cargando inventario…" />
          ) : (
            <EmptyState
              icon="file-tray-outline"
              title={edificio === SIN_EDIFICIO ? "Todos los equipos tienen edificio" : "Este edificio no tiene equipos"}
              message={canManage(userData) && edificio !== SIN_EDIFICIO ? "Agrega uno con el botón + o asígnalos en SIGAT Web." : undefined}
            />
          )
        }
      />

      {puedeAgregar && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddProduct", { edificio })}
          accessibilityRole="button"
          accessibilityLabel={`Agregar equipo en ${edificio}`}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
