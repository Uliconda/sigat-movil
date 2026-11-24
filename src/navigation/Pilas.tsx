import { createNativeStackNavigator, type NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ComponentType } from "react";
import { MenuButton } from "../components/MenuButton";
import { AddProductScreen } from "../screens/AddProductScreen";
import { CategoriasScreen } from "../screens/CategoriasScreen";
import { DetailScreen } from "../screens/DetailScreen";
import { EdificioScreen } from "../screens/EdificioScreen";
import { EdificiosScreen } from "../screens/EdificiosScreen";
import { EditProductScreen } from "../screens/EditProductScreen";
import { EquipoListScreen } from "../screens/EquipoListScreen";
import { InicioScreen } from "../screens/InicioScreen";
import { PersonalDetailScreen } from "../screens/PersonalDetailScreen";
import { PersonalFormScreen } from "../screens/PersonalFormScreen";
import { PersonalListScreen } from "../screens/PersonalListScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { BRAND } from "../theme/colors";
import type { StackParamList } from "../types";

const Stack = createNativeStackNavigator<StackParamList>();

const opcionesPila: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: BRAND.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "bold" },
};

// Cada pestaña es una pila con su pantalla raíz (con botón de menú) y todas las
// pantallas compartidas, para que un equipo o una persona se abra dentro de la
// pestaña actual y "Atrás" regrese a donde estabas.
function crearPila(raiz: keyof StackParamList, componente: ComponentType<never>, titulo: string) {
  return function Pila() {
    return (
      <Stack.Navigator initialRouteName={raiz} screenOptions={opcionesPila}>
        <Stack.Screen
          name={raiz}
          component={componente as ComponentType}
          options={({ navigation }) => ({
            title: titulo,
            headerLeft: () => <MenuButton navigation={navigation} />,
          })}
        />
        <Stack.Group>
          <Stack.Screen name="Edificio" component={EdificioScreen} options={({ route }) => ({ title: route.params.edificio })} />
          <Stack.Screen name="Listado" component={EquipoListScreen} options={({ route }) => ({ title: route.params?.titulo ?? "Equipos" })} />
          <Stack.Screen name="Detalles" component={DetailScreen} options={{ title: "Detalle del Equipo" }} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: "Agregar Equipo" }} />
          <Stack.Screen name="EditProduct" component={EditProductScreen} options={{ title: "Editar Equipo" }} />
          <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
          {raiz !== "PersonalList" && (
            <Stack.Screen name="PersonalList" component={PersonalListScreen} options={{ title: "Personal administrativo" }} />
          )}
          <Stack.Screen name="PersonalDetalle" component={PersonalDetailScreen} options={{ title: "Personal" }} />
          <Stack.Screen name="PersonalForm" component={PersonalFormScreen} options={{ title: "Alta de personal" }} />
        </Stack.Group>
      </Stack.Navigator>
    );
  };
}

export const InicioStack = crearPila("Inicio", InicioScreen, "SIGAT");
export const EdificiosStack = crearPila("Edificios", EdificiosScreen, "Edificios");
export const CategoriasStack = crearPila("Categorias", CategoriasScreen, "Categorías");
export const PersonalStack = crearPila("PersonalList", PersonalListScreen, "Personal administrativo");
