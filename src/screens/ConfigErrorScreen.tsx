import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Se muestra cuando la app se compiló sin la configuración de Supabase, en lugar
// de cerrarse sin explicación.
export function ConfigErrorScreen({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
    >
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Ionicons name="construct-outline" size={56} color={colors.warning} />
      </View>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Configuración incompleta</Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: 16, textAlign: "center" }}>
        Esta versión de SIGAT se compiló sin los datos de conexión al servidor, por eso no puede iniciar.
      </Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 15, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.subText, fontSize: 13, marginBottom: 6, fontWeight: "bold" }}>DETALLE PARA SOPORTE</Text>
        <Text style={{ color: colors.text, fontSize: 14 }}>{message}</Text>
        <Text style={{ color: colors.subText, fontSize: 12, marginTop: 10 }}>
          Versión {Constants.expoConfig?.version ?? "—"}
        </Text>
      </View>
      <Text style={{ color: colors.subText, fontSize: 13, marginTop: 16, textAlign: "center" }}>
        Contacta al administrador del sistema para obtener una versión actualizada.
      </Text>
    </ScrollView>
  );
}
