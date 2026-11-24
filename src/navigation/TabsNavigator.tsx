import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import type { ComponentProps } from "react";
import { BRAND } from "../theme/colors";
import { useTheme } from "../theme/useTheme";
import type { TabParamList } from "../types";
import { CategoriasStack, EdificiosStack, InicioStack, PersonalStack } from "./Pilas";

const Tab = createBottomTabNavigator<TabParamList>();

type Icono = ComponentProps<typeof Ionicons>["name"];

const PESTANAS: { name: keyof TabParamList; titulo: string; icono: Icono; component: () => React.JSX.Element }[] = [
  { name: "InicioTab", titulo: "Inicio", icono: "home", component: InicioStack },
  { name: "EdificiosTab", titulo: "Edificios", icono: "business", component: EdificiosStack },
  { name: "CategoriasTab", titulo: "Categorías", icono: "folder-open", component: CategoriasStack },
  { name: "PersonalTab", titulo: "Personal", icono: "people", component: PersonalStack },
];

// Pestañas de abajo: Inicio · Edificios · Categorías · Personal.
export function TabsNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: colors.subText,
        // La cámara ocupa toda la pantalla.
        tabBarStyle:
          getFocusedRouteNameFromRoute(route) === "Scanner"
            ? { display: "none" }
            : { backgroundColor: colors.card, borderTopColor: colors.divider },
      })}
    >
      {PESTANAS.map(({ name, titulo, icono, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            title: titulo,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? icono : (`${icono}-outline` as Icono)} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
