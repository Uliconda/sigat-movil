import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { ProductForm } from "../components/ProductForm";
import { updateEquipo } from "../services/supabaseData";
import { useTheme } from "../theme/useTheme";

export function EditProductScreen({ route, navigation }) {
  const { item = {} } = route.params || {};
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  if (!item.id) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>No se encontró el equipo a editar.</Text>
      </View>
    );
  }

  const handleUpdate = async (valores) => {
    setLoading(true);
    try {
      await updateEquipo(item.id, valores);
      Alert.alert("¡Actualizado!", "Los datos se han guardado.");
      navigation.navigate("Detalles", { item: { ...item, ...valores } });
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductForm
      title="Editar Equipo"
      idValue={item.id}
      initialValues={item}
      showCondicion
      submitLabel="GUARDAR CAMBIOS"
      loading={loading}
      onSubmit={handleUpdate}
    />
  );
}
