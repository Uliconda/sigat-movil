import { createDrawerNavigator } from "@react-navigation/drawer";
import type { User } from "@supabase/supabase-js";
import { NavigationContainer } from "@react-navigation/native";
import { View } from "react-native";
import { DrawerContent } from "../components/DrawerContent";
import { OfflineSyncBanner } from "../components/OfflineSyncBanner";
import { AboutScreen } from "../screens/AboutScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { useTheme } from "../theme/useTheme";
import type { DrawerParamList } from "../types";
import { MainStack, MenuButton } from "./MainStack";
import { PersonalStack } from "./PersonalStack";

const Drawer = createDrawerNavigator<DrawerParamList>();

// Con sesión: menú lateral + inventario. Sin sesión: pantalla de inicio de sesión.
export function AppNavigator({ user }: { user: User | null }) {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      {user ? (
        <View style={{ flex: 1 }}>
          <Drawer.Navigator
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
              headerShown: false,
              drawerStyle: { backgroundColor: colors.background, width: 280 },
            }}
          >
            <Drawer.Screen name="Main" component={MainStack} />
            <Drawer.Screen name="Personal" component={PersonalStack} />
            <Drawer.Screen
              name="About"
              component={AboutScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: "Acerca de",
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.primary,
                headerTitleStyle: { fontWeight: "bold" },
                headerLeft: () => <MenuButton navigation={navigation} color={colors.primary} />,
              })}
            />
          </Drawer.Navigator>
          {/* Se dibuja después del menú para flotar sobre todas las pantallas. */}
          <OfflineSyncBanner userId={user.id} />
        </View>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
