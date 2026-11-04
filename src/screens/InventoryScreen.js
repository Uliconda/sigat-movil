import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EquipoCard } from "../components/EquipoCard";
import { FolderCard } from "../components/FolderCard";
import { FormModal } from "../components/FormModal";
import { LevelHeader } from "../components/LevelHeader";
import { ThemedInput } from "../components/ThemedInput";
import { CATEGORIA_GENERAL, getCategoriaConfig, normalizarCarpeta } from "../constants/categorias";
import { canManage } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseClient";
import {
  applyRemoteChange,
  createEquipo,
  getEquipos,
  getEquiposLocal,
  updateEquipo,
} from "../services/supabaseData";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import {
  buscarEquipos,
  CAMPO_CARPETA as CAMPO,
  contarPorCarpeta,
  enCarpeta,
  sinPlantillas,
  tieneCarpetasReales,
} from "../utils/carpetas";

const TIPO = {
  categoria: "categoría",
  subcategoria: "subcategoría",
  seccion: "sección",
};

export function InventoryScreen() {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const puedeAdministrar = canManage(userData);

  const [equipos, setEquipos] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");

  // --- Navegación por carpetas (3 niveles) ---
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedNivel3, setSelectedNivel3] = useState(null);

  // --- Modales ---
  const [itemToEdit, setItemToEdit] = useState(null); // { tipo, oldName, newName }
  const [creationTargetLevel, setCreationTargetLevel] = useState(null); // "subcategoria" | "nivel3"
  const [newFolderName, setNewFolderName] = useState("");

  // Descarga completa desde Supabase (con respaldo en caché si no hay conexión).
  const cargarDatos = async () => {
    try {
      setEquipos(await getEquipos());
    } catch (e) {
      console.log("Error cargando equipos:", e);
    }
  };

  // Lectura instantánea desde el teléfono (caché + cambios pendientes), sin red.
  const cargarDatosLocales = async () => {
    try {
      setEquipos(await getEquiposLocal());
    } catch (e) {
      console.log("Error cargando equipos locales:", e);
    }
  };

  useEffect(() => {
    let active = true;
    // Muestra de inmediato lo que hay en el teléfono; la descarga completa se hace
    // cuando el canal en tiempo real queda conectado (y en cada reconexión).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatosLocales();
    const unsubscribe = navigation.addListener("focus", () => cargarDatosLocales());

    const channel = supabase
      .channel(`mobile-equipos-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipos" },
        async (payload) => {
          try {
            const row = payload.eventType === "DELETE" ? payload.old : payload.new;
            const { id, equipo } = await applyRemoteChange(payload.eventType, row);
            if (!active || !id) return;
            setEquipos((prev) => {
              if (!equipo) return prev.filter((item) => item.id !== id);
              const exists = prev.some((item) => item.id === id);
              return exists
                ? prev.map((item) => (item.id === id ? equipo : item))
                : [...prev, equipo];
            });
          } catch (error) {
            console.error("No se pudo aplicar un cambio en tiempo real:", error);
            if (active) void cargarDatos();
          }
        }
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          if (active) void cargarDatos();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Error en cambios de inventario en tiempo real:", error);
          // Sin tiempo real, al menos se descarga el inventario una vez.
          if (active) void cargarDatos();
        }
      });

    return () => {
      active = false;
      unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [navigation]);

  // ==========================================
  // DATOS DE CADA NIVEL
  // ==========================================
  const filteredEquipos = buscarEquipos(equipos, searchText);

  const listaCategorias = contarPorCarpeta(equipos, CAMPO.categoria);

  const equiposNivel2 = equipos.filter(enCarpeta(CAMPO.categoria, selectedCategory));
  const listaSubcategorias = contarPorCarpeta(equiposNivel2, CAMPO.subcategoria);
  const tieneSubcategoriasReales = tieneCarpetasReales(listaSubcategorias);

  const equiposNivel3 = equiposNivel2.filter(enCarpeta(CAMPO.subcategoria, selectedSubcategory));
  const listaNivel3 = contarPorCarpeta(equiposNivel3, CAMPO.seccion);
  const tieneNivel3Real = tieneCarpetasReales(listaNivel3);

  const equiposFinales = sinPlantillas(equiposNivel3.filter(enCarpeta(CAMPO.seccion, selectedNivel3)));

  // ==========================================
  // EDICIÓN Y CREACIÓN DE CARPETAS
  // ==========================================
  const handleLongPressMenu = (tipo, nombreActual) => {
    if (!puedeAdministrar) return;
    Alert.alert("⚙️ Opciones", `¿Qué deseas hacer con la ${tipo} "${nombreActual}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Editar Nombre", onPress: () => setItemToEdit({ tipo, oldName: nombreActual, newName: nombreActual }) },
      { text: "Eliminar", style: "destructive", onPress: () => handleEliminarConfirmacion(tipo, nombreActual) },
    ]);
  };

  const handleEliminarConfirmacion = (tipo, nombreActual) => {
    Alert.alert("⚠️ Confirmar Eliminación", `¿Seguro que deseas eliminar "${nombreActual}"?\n\nLos equipos serán reasignados a "General".`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sí, Eliminar", style: "destructive", onPress: () => procesarAccionEquipo(tipo, nombreActual, "General") },
    ]);
  };

  // ¿El equipo pertenece a la carpeta indicada, dentro de la ruta seleccionada?
  const perteneceACarpeta = (item, tipo, nombre) => {
    const enCategoria = normalizarCarpeta(item.categoria) === (tipo === TIPO.categoria ? nombre : selectedCategory);
    if (tipo === TIPO.categoria) return enCategoria;
    const enSub = normalizarCarpeta(item.subcategoria) === (tipo === TIPO.subcategoria ? nombre : selectedSubcategory);
    if (tipo === TIPO.subcategoria) return enCategoria && enSub;
    return enCategoria && enSub && normalizarCarpeta(item.subSubcategoria) === nombre;
  };

  const procesarAccionEquipo = async (tipo, nombreActual, nuevoNombre) => {
    const campo = { [TIPO.categoria]: CAMPO.categoria, [TIPO.subcategoria]: CAMPO.subcategoria, [TIPO.seccion]: CAMPO.seccion }[tipo];
    const nombre = normalizarCarpeta(nombreActual);
    try {
      await Promise.all(
        equipos
          .filter((item) => perteneceACarpeta(item, tipo, nombre))
          .map((item) => updateEquipo(item.id, { [campo]: nuevoNombre }))
      );
      Alert.alert("¡Listo!", "Actualizado correctamente.");
      cargarDatosLocales();
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const guardarNuevoNombre = () => {
    const nuevo = itemToEdit.newName.trim();
    if (!nuevo) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }
    const { tipo, oldName } = itemToEdit;
    setItemToEdit(null);
    procesarAccionEquipo(tipo, oldName, nuevo);

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

  // Las carpetas vacías se guardan como un equipo plantilla (isTemplate).
  const handleCrearCarpeta = async () => {
    const nombre = newFolderName.trim();
    if (!nombre) {
      Alert.alert("Error", "El nombre no puede estar vacío.");
      return;
    }
    const esNivel3 = creationTargetLevel === "nivel3";
    try {
      await createEquipo({
        nombre: "Plantilla Sistema",
        categoria: selectedCategory,
        subcategoria: esNivel3 ? selectedSubcategory : normalizarCarpeta(nombre),
        subSubcategoria: esNivel3 ? normalizarCarpeta(nombre) : CATEGORIA_GENERAL,
        estado: "SISTEMA",
        isTemplate: true,
      });
      Alert.alert("¡Éxito!", "Carpeta creada.");
      cerrarModalCreacion();
      cargarDatosLocales();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================
  const renderEquipo = ({ item }) => (
    <EquipoCard item={item} onPress={() => navigation.navigate("Detalles", { item })} />
  );

  const renderCategoria = ({ item }) => {
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
  const renderSubcarpeta = (item, icon, tipo, onSelect) => {
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

  const listaEquipos = (key, data) => (
    <FlatList key={key} data={data} renderItem={renderEquipo} keyExtractor={(i) => i.id} contentContainerStyle={styles.listContent} />
  );

  const listaCarpetas = (key, data, renderItem) => (
    <FlatList key={key} data={data} renderItem={renderItem} keyExtractor={(i) => i.nombre} numColumns={2} contentContainerStyle={styles.listContent} />
  );

  const crear = (nivel) => (puedeAdministrar ? () => setCreationTargetLevel(nivel) : undefined);

  const volverACategorias = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedNivel3(null);
  };
  const volverASubcategorias = () => {
    setSelectedSubcategory(null);
    setSelectedNivel3(null);
  };

  // Árbol de decisión: qué se muestra según la búsqueda y la carpeta seleccionada.
  const renderContenido = () => {
    if (searchText !== "") return listaEquipos("lista-busqueda", filteredEquipos);

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
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <TouchableOpacity style={styles.bigOrangeButton} onPress={() => navigation.navigate("Scanner", { returnMode: false })}>
        <Text style={styles.bigButtonText}>ESCANEAR PRODUCTO</Text>
      </TouchableOpacity>

      <View style={styles.headerRow}>
        {isSearchActive ? (
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.divider }]}>
            <Ionicons name="search" size={20} color={colors.subText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar producto..."
              placeholderTextColor={colors.subText}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => { setIsSearchActive(false); setSearchText(""); }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar búsqueda"
            >
              <Ionicons name="close-circle" size={24} color={colors.subText} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "space-between" }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{titulo}</Text>
            <TouchableOpacity onPress={() => setIsSearchActive(true)} accessibilityRole="button" accessibilityLabel="Buscar">
              <Ionicons name="search" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
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
          onChangeText={(text) => setItemToEdit((prev) => ({ ...prev, newName: text }))}
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
