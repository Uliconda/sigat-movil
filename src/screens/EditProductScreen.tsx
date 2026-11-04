import { useState } from "react";
import { Alert, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProductForm, type ProductFormValues } from "../components/ProductForm";
import { updateEquipo } from "../services/supabaseData";
import { useTheme } from "../theme/useTheme";
import type { MainStackParamList } from "../types";

export function EditProductScreen({ route, navigation }: NativeStackScreenProps<MainStackParamList, "EditProduct">) {
  const item = route.params?.item;
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  if (!item?.id) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.text }}>No se encontró el equipo a editar.</Text>
      </View>
    );
  }

  const handleUpdate = async (valores: ProductFormValues) => {
    setLoading(true);
    try {
      await updateEquipo(item.id, valores);
      Alert.alert("¡Actualizado!", "Los datos se han guardado.");
      navigation.navigate("Detalles", { item: { ...item, ...valores } });
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : String(error));
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
