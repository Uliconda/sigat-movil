import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, DrawerItem, type DrawerContentComponentProps } from "@react-navigation/drawer";
import { Alert, Image, Text, View } from "react-native";
import { canManage, isSuperadmin } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabaseClient";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

export function DrawerContent(props: DrawerContentComponentProps) {
  const { userData } = useAuth();
  const { colors } = useTheme();

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", onPress: () => supabase.auth.signOut() },
    ]);
  };

  const labelStyle = { color: colors.text, fontSize: 16 };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
      style={{ backgroundColor: colors.background }}
    >
      <View style={[styles.drawerHeader, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}>
        <Image
          source={require("../../assets/assets_buho.png")}
          style={{ width: 100, height: 100, resizeMode: "contain", marginBottom: 15 }}
          accessibilityLabel="Logotipo de SIGAT"
        />
        <Text style={[styles.drawerName, { color: colors.text }]}>
          {userData?.nombre || "Cargando Usuario..."}
        </Text>
        <Text style={[styles.drawerEmail, { color: colors.subText }]}>{userData?.email || ""}</Text>

        {canManage(userData) && (
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "bold", marginTop: 8, textAlign: "center" }}>
            ⭐ {isSuperadmin(userData) ? "SUPERADMINISTRADOR" : "ADMINISTRADOR"}
          </Text>
        )}
      </View>

      <View style={{ paddingTop: 10 }}>
        <DrawerItem
          label="Inicio"
          labelStyle={labelStyle}
          icon={() => <Ionicons name="home" size={22} color={colors.primary} />}
          onPress={() => props.navigation.navigate("Main", { screen: "InventoryList" })}
        />
        <DrawerItem
          label="Acerca de"
          labelStyle={labelStyle}
          icon={() => <Ionicons name="information-circle" size={22} color={colors.primary} />}
          onPress={() => props.navigation.navigate("About")}
        />
        <DrawerItem
          label="Cerrar Sesión"
          labelStyle={{ color: colors.danger, fontSize: 16, fontWeight: "bold" }}
          icon={() => <Ionicons name="power" size={22} color={colors.danger} />}
          onPress={handleLogout}
        />
      </View>
    </DrawerContentScrollView>
  );
}
