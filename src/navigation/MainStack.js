import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity } from "react-native";
import { AddProductScreen } from "../screens/AddProductScreen";
import { DetailScreen } from "../screens/DetailScreen";
import { EditProductScreen } from "../screens/EditProductScreen";
import { InventoryScreen } from "../screens/InventoryScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { BRAND } from "../theme/colors";

const Stack = createNativeStackNavigator();

export function MenuButton({ navigation, color = "white" }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ marginLeft: 10, marginRight: 15 }}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
    >
      <Ionicons name="menu" size={30} color={color} />
    </TouchableOpacity>
  );
}

export function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: BRAND.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="InventoryList"
        component={InventoryScreen}
        options={({ navigation }) => ({
          title: "Inventario SIGAT",
          headerLeft: () => <MenuButton navigation={navigation} />,
        })}
      />
      <Stack.Screen name="Detalles" component={DetailScreen} options={{ title: "Detalle del Equipo" }} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: "Agregar Equipo" }} />
      <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ title: "Editar Equipo" }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
