import { Ionicons } from "@expo/vector-icons";
import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { type ReactElement, useState } from "react";
import {
  Alert,
  FlatList,
  type ListRenderItem,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EmptyState } from "../components/EmptyState";
import { EquipoCard } from "../components/EquipoCard";
import { FiltroChips } from "../components/FiltroChips";
import { FolderCard } from "../components/FolderCard";
import { FormModal } from "../components/FormModal";
import { LevelHeader } from "../components/LevelHeader";
import { ThemedInput } from "../components/ThemedInput";
import { CATEGORIA_GENERAL, getCategoriaConfig, normalizarCarpeta } from "../constants/categorias";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { useInventario } from "../hooks/useInventario";
import { crearCarpeta, eliminarCarpeta, renombrarCarpeta } from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import {
  buildInventoryTree,
  CAMPO_CARPETA as CAMPO,
  contarPorCarpeta,
  enCarpeta,
  findCarpetaId,
  sinPlantillas,
  tieneCarpetasReales,
  type ConteoCarpeta,
} from "../utils/carpetas";
import type { Equipo, StackParamList } from "../types";
import { contarPorEdificio, edificioDe, SIN_EDIFICIO } from "../utils/ubicacion";

const TIPO = {
  categoria: "categoría",
  subcategoria: "subcategoría",
  seccion: "sección",
} as const;

type TipoCarpeta = (typeof TIPO)[keyof typeof TIPO];
type NivelCreacion = "subcategoria" | "nivel3";

interface CarpetaEnEdicion {
  tipo: TipoCarpeta;
  oldName: string;
  newName: string;
}

// Pestaña Categorías: carpetas Categoría › Subcategoría › Sección, con filtro
// opcional por edificio. Con un edificio elegido solo se muestran las carpetas
// que tienen equipos en él.
export function CategoriasScreen() {
  const navigation = useNavigation<NavigationProp<StackParamList>>();
  const { userData } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const puedeAdministrar = canManage(userData);

  const { equipos: todos, carpetas, ubicaciones, recargar: cargarDatos, cargando, refrescando, refrescar } = useInventario();
  const [edificioFiltro, setEdificioFiltro] = useState<string | null>(null);
  const opcionesEdificio = contarPorEdificio(todos, ubicaciones.edificios).filter((e) => e.cantidad > 0);
  const equipos = edificioFiltro ? todos.filter((e) => edificioDe(e) === edificioFiltro) : todos;
  // Sin filtro se muestran también las carpetas vacías (para poder llenarlas).
  const vacias = <T,>(lista: T[]): T[] => (edificioFiltro ? [] : lista);

  // --- Navegación por carpetas (3 niveles) ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedNivel3, setSelectedNivel3] = useState<string | null>(null);

  // --- Modales ---
  const [itemToEdit, setItemToEdit] = useState<CarpetaEnEdicion | null>(null);
  const [creationTargetLevel, setCreationTargetLevel] = useState<NivelCreacion | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  // ==========================================
  // DATOS DE CADA NIVEL
  // ==========================================
  // Carpetas del servidor + las que usan los equipos (aunque aún no se sincronicen).
  const tree = buildInventoryTree(carpetas, todos);

  const listaCategorias = contarPorCarpeta(equipos, CAMPO.categoria, vacias(Object.keys(tree)));

  const equiposNivel2 = equipos.filter(enCarpeta(CAMPO.categoria, selectedCategory));
  const listaSubcategorias = contarPorCarpeta(equiposNivel2, CAMPO.subcategoria, vacias(Object.keys((selectedCategory && tree[selectedCategory]) || {})));
  const tieneSubcategoriasReales = tieneCarpetasReales(listaSubcategorias);

  const equiposNivel3 = equiposNivel2.filter(enCarpeta(CAMPO.subcategoria, selectedSubcategory));
  const listaNivel3 = contarPorCarpeta(equiposNivel3, CAMPO.seccion, vacias((selectedCategory && selectedSubcategory && tree[selectedCategory]?.[selectedSubcategory]) || []));
  const tieneNivel3Real = tieneCarpetasReales(listaNivel3);

  const equiposFinales = sinPlantillas(equiposNivel3.filter(enCarpeta(CAMPO.seccion, selectedNivel3)));

  // ==========================================
  // EDICIÓN Y CREACIÓN DE CARPETAS
  // ==========================================
  const handleLongPressMenu = (tipo: TipoCarpeta, nombreActual: string) => {
    if (!puedeAdministrar) return;
    Alert.alert("⚙️ Opciones", `¿Qué deseas hacer con la ${tipo} "${nombreActual}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Editar Nombre", onPress: () => setItemToEdit({ tipo, oldName: nombreActual, newName: nombreActual }) },
      { text: "Eliminar", style: "destructive", onPress: () => handleEliminarConfirmacion(tipo, nombreActual) },
    ]);
  };

  // Ruta completa de una carpeta según su tipo y la navegación actual.
  const rutaDe = (tipo: TipoCarpeta, nombre: string): (string | null)[] => {
    if (tipo === TIPO.categoria) return [nombre];
    if (tipo === TIPO.subcategoria) return [selectedCategory, nombre];
    return [selectedCategory, selectedSubcategory, nombre];
  };

  // Las operaciones de carpetas se hacen en el servidor; sin ID aún no se sincronizó.
  const idDeCarpeta = (ruta: (string | null)[]) => {
    const id = findCarpetaId(carpetas, ruta);
    if (!id) {
      Alert.alert(
        "Carpeta sin sincronizar",
        "Esta carpeta todavía no está en el servidor. Conéctate y espera a que se sincronicen los cambios."
      );
    }
    return id;
  };

  // Ejecuta una operación de carpetas y recarga el inventario.
  const ejecutarCarpeta = async (operacion: () => Promise<unknown>, mensaje: string) => {
    try {
      await operacion();
      Alert.alert("¡Listo!", mensaje);
      void cargarDatos();
      return true;
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  const handleEliminarConfirmacion = (tipo: TipoCarpeta, nombreActual: string) => {
    const id = idDeCarpeta(rutaDe(tipo, nombreActual));
    if (!id) return;
    Alert.alert("⚠️ Confirmar Eliminación", `¿Seguro que deseas eliminar "${nombreActual}"?\n\nLos equipos serán reasignados a "General".`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, Eliminar",
        style: "destructive",
        onPress: () => ejecutarCarpeta(() => eliminarCarpeta(id), "Carpeta eliminada."),
      },
    ]);
  };

  const guardarNuevoNombre = async () => {
    if (!itemToEdit) return;
    const nuevo = itemToEdit.newName.trim();
    if (!nuevo) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }
    const { tipo, oldName } = itemToEdit;
    const id = idDeCarpeta(rutaDe(tipo, oldName));
    if (!id) return;
    setItemToEdit(null);

    const ok = await ejecutarCarpeta(() => renombrarCarpeta(id, nuevo), "Carpeta renombrada.");
    if (!ok) return;
    const viejo = normalizarCarpeta(oldName);
    const nuevoNormalizado = normalizarCarpeta(nuevo);
    if (tipo === TIPO.categoria && selectedCategory === viejo) setSelectedCategory(nuevoNormalizado);
    else if (tipo === TIPO.subcategoria && selectedSubcategory === viejo) setSelectedSubcategory(nuevoNormalizado);
    else if (tipo === TIPO.seccion && selectedNivel3 === viejo) setSelectedNivel3(nuevoNormalizado);
  };

  const cerrarModalCreacion = () => {
    setCreationTargetLevel(null);
    setNewFolderName("");
  };

  const handleCrearCarpeta = async () => {
    const nombre = newFolderName.trim();
    if (!nombre) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }
    const rutaPadre = creationTargetLevel === "nivel3" ? [selectedCategory, selectedSubcategory] : [selectedCategory];
    const parentId = idDeCarpeta(rutaPadre);
    if (!parentId) return;
    const ok = await ejecutarCarpeta(() => crearCarpeta(parentId, nombre), "Carpeta creada.");
    if (ok) cerrarModalCreacion();
  };

  // ==========================================
  // RENDERERS
  // ==========================================
  const renderEquipo: ListRenderItem<Equipo> = ({ item }) => (
    <EquipoCard item={item} onPress={() => navigation.navigate("Detalles", { item })} />
  );

  const renderCategoria: ListRenderItem<ConteoCarpeta> = ({ item }) => {
    const config = getCategoriaConfig(item.nombre);
    return (
      <FolderCard
        nombre={item.nombre}
        cantidad={item.cantidad}
        icon={config.icon}
        color={config.color}
        borderColor={config.color}
        onPress={() => setSelectedCategory(item.nombre)}
        onLongPress={() => handleLongPressMenu(TIPO.categoria, item.nombre)}
      />
    );
  };

  // Subcarpeta (subcategoría o sección). La carpeta "GENERAL" vacía no se muestra.
  const renderSubcarpeta = (
    item: ConteoCarpeta,
    icon: string,
    tipo: TipoCarpeta,
    onSelect: (nombre: string) => void
  ): ReactElement | null => {
    if (item.nombre === CATEGORIA_GENERAL && item.cantidad === 0) return null;
    return (
      <FolderCard
        nombre={item.nombre}
        cantidad={item.cantidad}
        icon={icon}
        color={getCategoriaConfig(selectedCategory).color}
        onPress={() => onSelect(item.nombre)}
        onLongPress={() => handleLongPressMenu(tipo, item.nombre)}
      />
    );
  };

  // Deslizar hacia abajo en cualquier lista sincroniza y vuelve a descargar.
  const refreshControl = (
    <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.primary]} tintColor={colors.primary} />
  );

  // Mientras se descarga por primera vez se muestra la carga en lugar de "vacío".
  const vacioOCargando = (vacio: ReactElement) =>
    cargando ? <EmptyState loading title="Cargando inventario…" /> : vacio;

  const carpetaVacia = (
    <EmptyState
      icon="file-tray-outline"
      title="Esta carpeta está vacía"
      message={puedeAdministrar ? "Agrega equipos con el botón +." : undefined}
    />
  );

  const listaEquipos = (key: string, data: Equipo[], vacio: ReactElement = carpetaVacia) => (
    <FlatList
      key={key}
      data={data}
      renderItem={renderEquipo}
      keyExtractor={(i) => i.id}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      ListEmptyComponent={vacioOCargando(vacio)}
      keyboardShouldPersistTaps="handled"
    />
  );

  const listaCarpetas = (key: string, data: ConteoCarpeta[], renderItem: ListRenderItem<ConteoCarpeta>) => (
    <FlatList
      key={key}
      data={data}
      renderItem={renderItem}
      keyExtractor={(i) => i.nombre}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      refreshControl={refreshControl}
      ListEmptyComponent={vacioOCargando(
        <EmptyState
          title="Aún no hay equipos"
          message={puedeAdministrar ? "Registra el primero con el botón +." : "Desliza hacia abajo para actualizar."}
        />
      )}
    />
  );

  const crear = (nivel: NivelCreacion) => (puedeAdministrar ? () => setCreationTargetLevel(nivel) : undefined);

  const volverACategorias = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedNivel3(null);
  };
  const volverASubcategorias = () => {
    setSelectedSubcategory(null);
    setSelectedNivel3(null);
  };

  // Árbol de decisión: qué se muestra según la carpeta seleccionada.
  const renderContenido = () => {
    if (!selectedCategory) {
      return listaCarpetas("lista-cat-2col", listaCategorias, renderCategoria);
    }

    if (!tieneSubcategoriasReales) {
      // Categoría sin subcarpetas: se muestran sus equipos directamente.
      return (
        <View style={{ flex: 1 }}>
          <LevelHeader backLabel="Volver a Categorías" onBack={volverACategorias} onCreate={crear("subcategoria")} />
          {listaEquipos("prod-n1", sinPlantillas(equiposNivel2))}
        </View>
      );
    }

    if (!selectedSubcategory) {
      return (
        <View style={{ flex: 1 }}>
          <LevelHeader backLabel="Volver a Categorías" onBack={volverACategorias} onCreate={crear("subcategoria")} />
          {listaCarpetas("lista-sub-2col", listaSubcategorias, ({ item }) =>
            renderSubcarpeta(item, "📁", TIPO.subcategoria, setSelectedSubcategory))}
        </View>
      );
    }

    if (!tieneNivel3Real) {
      // Subcategoría sin secciones: se muestran sus equipos directamente.
      return (
        <View style={{ flex: 1 }}>
          <LevelHeader backLabel={`Volver a ${selectedCategory}`} onBack={volverASubcategorias} onCreate={crear("nivel3")} />
          {listaEquipos("prod-n2", sinPlantillas(equiposNivel3))}
        </View>
      );
    }

    if (!selectedNivel3) {
      return (
        <View style={{ flex: 1 }}>
          <LevelHeader backLabel={`Volver a ${selectedCategory}`} onBack={volverASubcategorias} onCreate={crear("nivel3")} />
          {listaCarpetas("lista-n3-2col", listaNivel3, ({ item }) =>
            renderSubcarpeta(item, "📂", TIPO.seccion, setSelectedNivel3))}
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <LevelHeader backLabel={`Volver a ${selectedSubcategory}`} onBack={() => setSelectedNivel3(null)} />
        {listaEquipos("prod-n3", equiposFinales)}
      </View>
    );
  };

  const titulo = selectedNivel3 || selectedSubcategory || selectedCategory || "Categorías";
  const esNivel3 = creationTargetLevel === "nivel3";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {opcionesEdificio.some((e) => e.nombre !== SIN_EDIFICIO) && (
        <FiltroChips
          titulo="Edificio"
          etiquetaTodos="Todos los edificios"
          opciones={opcionesEdificio.map((e) => ({ valor: e.nombre, cantidad: e.cantidad }))}
          valor={edificioFiltro}
          onCambiar={setEdificioFiltro}
        />
      )}

      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {edificioFiltro ? `${titulo} · ${edificioFiltro}` : titulo}
        </Text>
      </View>

      {renderContenido()}

      <FormModal
        visible={itemToEdit !== null}
        title={`Editar ${itemToEdit?.tipo ?? ""}`}
        subtitle={`Nombre anterior: ${itemToEdit?.oldName ?? ""}`}
        confirmLabel="Guardar"
        onCancel={() => setItemToEdit(null)}
        onConfirm={guardarNuevoNombre}
      >
        <ThemedInput
          value={itemToEdit?.newName ?? ""}
          onChangeText={(text) => setItemToEdit((prev) => (prev ? { ...prev, newName: text } : prev))}
          autoFocus
        />
      </FormModal>

      <FormModal
        visible={creationTargetLevel !== null}
        title={esNivel3 ? `Nueva sección en ${selectedSubcategory}` : `Nueva subcategoría en ${selectedCategory}`}
        confirmLabel="Crear"
        onCancel={cerrarModalCreacion}
        onConfirm={handleCrearCarpeta}
      >
        <ThemedInput placeholder="Ej. Laptops, Monitores..." value={newFolderName} onChangeText={setNewFolderName} autoFocus />
      </FormModal>

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
