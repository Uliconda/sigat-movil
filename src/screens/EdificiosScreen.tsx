import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { FolderCard } from "../components/FolderCard";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { useInventario } from "../hooks/useInventario";
import { BRAND } from "../theme/colors";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { StackParamList } from "../types";
import { contarPorEdificio, SIN_EDIFICIO } from "../utils/ubicacion";

// Edificios del catálogo con cuántos equipos tiene cada uno. Al final, los
// equipos que todavía no tienen edificio.
export function EdificiosScreen({ navigation }: NativeStackScreenProps<StackParamList, "Edificios">) {
  const { userData } = useAuth();
  const { colors } = useTheme();
  const { equipos, ubicaciones, cargando, refrescando, refrescar } = useInventario();
  const lista = contarPorEdificio(equipos, ubicaciones.edificios);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={lista}
        keyExtractor={(e) => e.nombre}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <FolderCard
            nombre={item.nombre}
            cantidad={item.cantidad}
            icon={item.nombre === SIN_EDIFICIO ? "📦" : "🏢"}
            color={item.nombre === SIN_EDIFICIO ? BRAND.neutral : BRAND.primary}
            onPress={() => navigation.navigate("Edificio", { edificio: item.nombre })}
          />
        )}
        ListHeaderComponent={
          ubicaciones.edificios.length > 0 && canManage(userData) ? (
            <Text style={{ color: colors.subText, fontSize: 12, marginBottom: 8, marginHorizontal: 8 }}>
              Los edificios, espacios y departamentos / áreas se administran en SIGAT Web › Inventario › Por edificio.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          cargando ? (
            <EmptyState loading title="Cargando inventario…" />
          ) : (
            <EmptyState
              icon="business-outline"
              title="Aún no hay edificios"
              message="Se dan de alta en SIGAT Web › Inventario › Por edificio."
            />
          )
        }
      />
    </View>
  );
}
