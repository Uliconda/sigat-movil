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

const Drawer = createDrawerNavigator<DrawerParamList>();

// Con sesión: menú lateral + inventario. Sin sesión: pantalla de inicio de sesión.
export function AppNavigator({ user }: { user: User | null }) {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      {user ? (
        <View style={{ flex: 1 }}>
          <OfflineSyncBanner userId={user.id} />
          <Drawer.Navigator
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{
              headerShown: false,
              drawerStyle: { backgroundColor: colors.background, width: 280 },
            }}
          >
            <Drawer.Screen name="Main" component={MainStack} />
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
        </View>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}
