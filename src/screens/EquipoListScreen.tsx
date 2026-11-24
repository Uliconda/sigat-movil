import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { EquipoCard } from "../components/EquipoCard";
import { FiltroChips } from "../components/FiltroChips";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { useInventario } from "../hooks/useInventario";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { FiltroEstado, StackParamList } from "../types";
import {
  areaDe,
  categoriaDe,
  contarPor,
  contarPorEstado,
  edificioDe,
  espacioDe,
  FILTROS_ESTADO,
  filtrarEquipos,
  SIN_AREA,
  SIN_EDIFICIO,
  SIN_ESPACIO,
  subcategoriaDe,
} from "../utils/ubicacion";

// Lista de equipos con filtros. Lo que llega en los parámetros (edificio,
// espacio, categoría) queda fijo; el resto se elige con chips. Cada fila de
// chips se muestra solo si hay más de una opción. El botón + agrega un equipo
// con el edificio, espacio y departamento / área que estén elegidos.
export function EquipoListScreen({ route, navigation }: NativeStackScreenProps<StackParamList, "Listado">) {
  const fijos = route.params ?? {};
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { equipos, cargando, refrescando, refrescar } = useInventario();

  const [texto, setTexto] = useState("");
  const [edificio, setEdificio] = useState<string | null>(null);
  const [espacio, setEspacio] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [estado, setEstado] = useState<FiltroEstado | null>(fijos.estado ?? null);

  const edificioFinal = fijos.edificio ?? edificio;
  const espacioFinal = fijos.espacio ?? espacio;
  const categoriaFinal = fijos.categoria ?? categoria;

  // Opciones de cada fila: se cuentan con los demás filtros aplicados, así el
  // número del chip es lo que vas a ver al tocarlo.
  const sin = (omitir: string) =>
    filtrarEquipos(equipos, {
      texto,
      edificio: edificioFinal,
      categoria: categoriaFinal,
      espacio: omitir === "espacio" ? fijos.espacio : espacioFinal,
      area: omitir === "espacio" || omitir === "area" ? null : area,
      subcategoria: omitir === "subcategoria" ? null : subcategoria,
      estado: omitir === "estado" ? null : estado,
    });
  const sinEdificio = filtrarEquipos(equipos, { texto, categoria: categoriaFinal, estado });
  const sinCategoria = filtrarEquipos(equipos, { texto, edificio: edificioFinal, espacio: espacioFinal, area, estado });

  const lista = sin("");
  const porEstado = contarPorEstado(sin("estado"));

  const cambiarEspacio = (valor: string | null) => {
    setEspacio(valor);
    setArea(null);
  };
  const cambiarEdificio = (valor: string | null) => {
    setEdificio(valor);
    cambiarEspacio(null);
  };
  const cambiarCategoria = (valor: string | null) => {
    setCategoria(valor);
    setSubcategoria(null);
  };

  const filas: { clave: string; titulo: string; opciones: { valor: string; cantidad: number }[]; valor: string | null; onCambiar: (v: string | null) => void }[] = [];
  if (!fijos.edificio) {
    filas.push({ clave: "edificio", titulo: "Edificio", opciones: aOpciones(contarPor(sinEdificio, edificioDe)), valor: edificio, onCambiar: cambiarEdificio });
  }
  if (edificioFinal && !fijos.espacio) {
    filas.push({ clave: "espacio", titulo: "Espacio", opciones: aOpciones(contarPor(sin("espacio"), espacioDe)), valor: espacio, onCambiar: cambiarEspacio });
  }
  if (edificioFinal && espacioFinal) {
    filas.push({ clave: "area", titulo: "Departamento / área", opciones: aOpciones(contarPor(sin("area"), areaDe)), valor: area, onCambiar: setArea });
  }
  if (!fijos.categoria) {
    filas.push({ clave: "categoria", titulo: "Categoría", opciones: aOpciones(contarPor(sinCategoria, categoriaDe)), valor: categoria, onCambiar: cambiarCategoria });
  }
  if (categoriaFinal) {
    filas.push({ clave: "subcategoria", titulo: "Subcategoría", opciones: aOpciones(contarPor(sin("subcategoria"), subcategoriaDe)), valor: subcategoria, onCambiar: setSubcategoria });
  }

  const hayFiltros = Boolean(texto || edificio || espacio || area || categoria || subcategoria || (estado && estado !== fijos.estado));
  const limpiar = () => {
    setTexto("");
    setEdificio(null);
    setEspacio(null);
    setArea(null);
    setCategoria(null);
    setSubcategoria(null);
    setEstado(fijos.estado ?? null);
  };

  // Ubicación para el equipo nuevo: solo lo que sea un lugar real.
  const real = (valor: string | null | undefined, sin: string) => (valor && valor !== sin ? valor : undefined);
  const nuevoEn = {
    edificio: real(edificioFinal, SIN_EDIFICIO),
    espacio: real(espacioFinal, SIN_ESPACIO),
    area: real(area, SIN_AREA),
  };
  const descripcionNuevo = nuevoEn.edificio ? [nuevoEn.edificio, nuevoEn.espacio, nuevoEn.espacio && nuevoEn.area].filter(Boolean).join(" › ") : "";

  const encabezado = (
    <View>
      <View style={[styles.searchContainer, { flex: 0, backgroundColor: colors.inputBg, borderColor: colors.divider, marginBottom: 12 }]}>
        <Ionicons name="search" size={18} color={colors.subText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar en esta lista…"
          autoCorrect={false}
          placeholderTextColor={colors.subText}
          value={texto}
          onChangeText={setTexto}
          accessibilityLabel="Buscar en esta lista"
        />
      </View>

      {filas
        // Con una sola opción y nada elegido, el filtro no aporta nada.
        .filter((f) => f.opciones.length > 1 || f.valor !== null)
        .map((f) => (
          <FiltroChips key={f.clave} titulo={f.titulo} opciones={f.opciones} valor={f.valor} onCambiar={f.onCambiar} />
        ))}

      <FiltroChips
        titulo="Estado"
        opciones={FILTROS_ESTADO.map(({ clave, etiqueta }) => ({ valor: clave, etiqueta, cantidad: porEstado[clave] }))}
        valor={estado}
        onCambiar={(v) => setEstado(v as FiltroEstado | null)}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {lista.length.toLocaleString("es-MX")} {lista.length === 1 ? "equipo" : "equipos"}
        </Text>
        {hayFiltros && (
          <TouchableOpacity onPress={limpiar} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>Quitar filtros</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={lista}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EquipoCard item={item} onPress={() => navigation.navigate("Detalles", { item })} />}
        ListHeaderComponent={encabezado}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          cargando ? (
            <EmptyState loading title="Cargando inventario…" />
          ) : (
            <EmptyState icon="search-outline" title="Ningún equipo coincide" message={hayFiltros ? "Prueba con menos filtros." : undefined} />
          )
        }
      />

      {canManage(userData) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddProduct", nuevoEn.edificio ? nuevoEn : undefined)}
          accessibilityRole="button"
          accessibilityLabel={descripcionNuevo ? `Agregar equipo en ${descripcionNuevo}` : "Agregar equipo"}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const aOpciones = (conteo: { nombre: string; cantidad: number }[]) => conteo.map((c) => ({ valor: c.nombre, cantidad: c.cantidad }));
