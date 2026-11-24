import { createDrawerNavigator } from "@react-navigation/drawer";
import type { User } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { DrawerContent } from "../components/DrawerContent";
import { OfflineSyncBanner } from "../components/OfflineSyncBanner";
import { InventarioProvider } from "../context/InventarioContext";
import { AboutScreen } from "../screens/AboutScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { useTheme } from "../theme/useTheme";
import type { DrawerParamList } from "../types";
import { TabsNavigator } from "./TabsNavigator";

const Drawer = createDrawerNavigator<DrawerParamList>();

// Con sesión: menú lateral (Acerca de, cerrar sesión) + pestañas. Sin sesión: inicio de sesión.
export function AppNavigator({ user }: { user: User | null }) {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      {user ? (
        <InventarioProvider key={user.id}>
          <View style={{ flex: 1 }}>
            <Drawer.Navigator
              drawerContent={(props) => <DrawerContent {...props} />}
              screenOptions={{
                headerShown: false,
                drawerStyle: { backgroundColor: colors.background, width: 280 },
              }}
            >
              <Drawer.Screen name="Tabs" component={TabsNavigator} />
              <Drawer.Screen
                name="About"
                component={AboutScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  title: "Acerca de",
                  headerStyle: { backgroundColor: colors.card },
                  headerTintColor: colors.primary,
                  headerTitleStyle: { fontWeight: "bold" },
                  // Acerca de está fuera de las pestañas: la flecha regresa a Inicio.
                  headerLeft: () => (
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Tabs", { screen: "InicioTab" })}
                      style={{ marginLeft: 10, marginRight: 15 }}
                      accessibilityRole="button"
                      accessibilityLabel="Regresar a Inicio"
                    >
                      <Ionicons name="arrow-back" size={26} color={colors.primary} />
                    </TouchableOpacity>
                  ),
                })}
              />
            </Drawer.Navigator>
            {/* Se dibuja después del menú para flotar sobre todas las pantallas. */}
            <OfflineSyncBanner userId={user.id} />
          </View>
        </InventarioProvider>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
