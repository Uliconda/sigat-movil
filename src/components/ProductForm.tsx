import { type ReactNode, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getCategoriaConfig, normalizarCarpeta, OPCION_OTRA } from "../constants/categorias";
import { CONDICIONES } from "../constants/estados";
import { useCategoryTree } from "../hooks/useCategoryTree";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import { LabeledInput, FieldLabel, ThemedInput } from "./ThemedInput";
import { type PickerItem, ThemedPicker } from "./ThemedPicker";
import type { EquipoData } from "../types";

/** Datos que entrega el formulario al guardar (carpetas ya normalizadas). */
export type ProductFormValues = {
  nombre: string;
  marca: string;
  no_serie: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
  subSubcategoria: string;
  condicion_fisica?: string;
};

interface ProductFormProps {
  title: string;
  idValue: string;
  /** Aviso debajo del ID (p. ej. "ID provisional"). */
  idNote?: ReactNode;
  initialValues?: Partial<EquipoData>;
  showCondicion?: boolean;
  submitLabel: string;
  loading?: boolean;
  canSubmit?: boolean;
  onSubmit: (valores: ProductFormValues) => void;
}

const CONDICION_ITEMS: PickerItem[] = [
  { label: `🟢 ${CONDICIONES.BUEN_ESTADO}`, value: CONDICIONES.BUEN_ESTADO },
  { label: `🟡 ${CONDICIONES.ACEPTABLE}`, value: CONDICIONES.ACEPTABLE },
  { label: `🔴 ${CONDICIONES.REEMPLAZAR}`, value: CONDICIONES.REEMPLAZAR },
];

const carpetaInicial = (valor?: string): string | null => (valor ? normalizarCarpeta(valor) : null);

function withOtra(items: PickerItem[], label: string): PickerItem[] {
  return [...items, { label, value: OPCION_OTRA }];
}

// Valor final de un nivel: la opción elegida, el nombre nuevo escrito, o "GENERAL".
function resolverCarpeta(seleccion: string | null, nuevoNombre: string): string {
  if (seleccion === OPCION_OTRA) return nuevoNombre.trim() ? normalizarCarpeta(nuevoNombre) : "";
  return normalizarCarpeta(seleccion);
}

// Formulario compartido por "Agregar equipo" y "Editar equipo".
export function ProductForm({
  title,
  idValue,
  idNote,
  initialValues = {},
  showCondicion = false,
  submitLabel,
  loading = false,
  canSubmit = true,
  onSubmit,
}: ProductFormProps) {
  const { colors } = useTheme();
  const tree = useCategoryTree();

  const [nombre, setNombre] = useState(initialValues.nombre ?? "");
  const [marca, setMarca] = useState(initialValues.marca ?? "");
  const [noSerie, setNoSerie] = useState(initialValues.no_serie ?? "");
  const [descripcion, setDescripcion] = useState(initialValues.descripcion ?? "");
  const [condicion, setCondicion] = useState<string>(initialValues.condicion_fisica ?? CONDICIONES.BUEN_ESTADO);

  const [categoria, setCategoria] = useState(carpetaInicial(initialValues.categoria));
  const [subcategoria, setSubcategoria] = useState(carpetaInicial(initialValues.subcategoria));
  const [nivel3, setNivel3] = useState(carpetaInicial(initialValues.subSubcategoria));
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaSubcategoria, setNuevaSubcategoria] = useState("");
  const [nuevaNivel3, setNuevaNivel3] = useState("");

  // --- Opciones de cada nivel, derivadas del árbol de carpetas ---
  const catItems = withOtra(
    Object.keys(tree).sort().map((cat) => ({ label: `${getCategoriaConfig(cat).icon} ${cat}`, value: cat })),
    "➕ Agregar otra categoría..."
  );
  const subs = categoria && categoria !== OPCION_OTRA ? Object.keys(tree[categoria] ?? {}).sort() : [];
  const subCatItems = withOtra(subs.map((sub) => ({ label: `📁 ${sub}`, value: sub })), "➕ Agregar otra subcategoría...");
  const n3s = categoria && subcategoria && subcategoria !== OPCION_OTRA ? tree[categoria]?.[subcategoria] ?? [] : [];
  const nivel3Items = withOtra(n3s.map((n3) => ({ label: `📂 ${n3}`, value: n3 })), "➕ Agregar nueva sección...");

  // Al cambiar un nivel, los niveles inferiores dejan de ser válidos.
  const cambiarCategoria = (value: string | null) => {
    setCategoria(value);
    setSubcategoria(null);
    setNuevaSubcategoria("");
    setNivel3(null);
    setNuevaNivel3("");
  };
  const cambiarSubcategoria = (value: string | null) => {
    setSubcategoria(value);
    setNivel3(null);
    setNuevaNivel3("");
  };

  const handleSubmit = () => {
    if (!nombre.trim()) {
      Alert.alert("Error", "El nombre del artículo no puede estar vacío.");
      return;
    }
    const valores = {
      categoria: resolverCarpeta(categoria, nuevaCategoria),
      subcategoria: resolverCarpeta(subcategoria, nuevaSubcategoria),
      subSubcategoria: resolverCarpeta(nivel3, nuevaNivel3),
    };
    if (!valores.categoria || !valores.subcategoria || !valores.subSubcategoria) {
      Alert.alert("Error", "Escribe el nombre de la nueva categoría, subcategoría o sección.");
      return;
    }
    onSubmit({
      ...valores,
      nombre: nombre.trim(),
      marca: marca.trim(),
      no_serie: noSerie.trim(),
      descripcion: descripcion.trim(),
      ...(showCondicion && { condicion_fisica: condicion }),
    });
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 15, paddingBottom: 40 }}
      enableOnAndroid
      extraHeight={120}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.detailCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>

        <FieldLabel>ID del Equipo:</FieldLabel>
        <ThemedInput value={idValue} editable={false} style={idNote ? { marginBottom: 5 } : null} />
        {idNote ? <View style={{ marginBottom: 15 }}>{idNote}</View> : null}

        <LabeledInput label="Nombre del Artículo:" value={nombre} onChangeText={setNombre} />
        <LabeledInput label="Marca:" value={marca} onChangeText={setMarca} />
        <LabeledInput label="Número de Serie:" value={noSerie} onChangeText={setNoSerie} autoCapitalize="characters" />

        <FieldLabel>Categoría:</FieldLabel>
        <ThemedPicker
          value={categoria}
          items={catItems}
          onChange={cambiarCategoria}
          placeholder="Selecciona una categoría"
          modalTitle="Categorías"
        />
        {categoria === OPCION_OTRA && (
          <ThemedInput placeholder="Escribe la nueva categoría" value={nuevaCategoria} onChangeText={setNuevaCategoria} />
        )}

        <FieldLabel>Subcategoría:</FieldLabel>
        <ThemedPicker
          value={subcategoria}
          items={subCatItems}
          onChange={cambiarSubcategoria}
          placeholder="Selecciona una subcategoría"
          modalTitle="Subcategorías"
          disabled={!categoria}
        />
        {subcategoria === OPCION_OTRA && (
          <ThemedInput placeholder="Escribe la nueva subcategoría" value={nuevaSubcategoria} onChangeText={setNuevaSubcategoria} />
        )}

        <FieldLabel>Sección / Tercer Nivel:</FieldLabel>
        <ThemedPicker
          value={nivel3}
          items={nivel3Items}
          onChange={setNivel3}
          placeholder="Selecciona una sección"
          modalTitle="Secciones"
          disabled={!subcategoria}
        />
        {nivel3 === OPCION_OTRA && (
          <ThemedInput placeholder="Ej. Laptops, Impresoras..." value={nuevaNivel3} onChangeText={setNuevaNivel3} />
        )}

        {showCondicion && (
          <>
            <FieldLabel>Condición Física:</FieldLabel>
            <ThemedPicker
              value={condicion}
              items={CONDICION_ITEMS}
              onChange={(value) => setCondicion(value ?? CONDICIONES.BUEN_ESTADO)}
              modalTitle="Condición Física"
            />
          </>
        )}

        <LabeledInput label="Descripción Breve:" value={descripcion} onChangeText={setDescripcion} multiline />

        <TouchableOpacity
          style={[styles.bigOrangeButton, !canSubmit && { backgroundColor: colors.disabled }]}
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.bigButtonText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>
  );
}
