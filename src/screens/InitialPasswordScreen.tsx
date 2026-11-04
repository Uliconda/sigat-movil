import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from "react-native";
import { ThemedInput } from "../components/ThemedInput";
import { getProfile } from "../services/supabaseData";
import { supabase } from "../services/supabaseClient";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";
import type { Perfil } from "../types";

const MIN_PASSWORD_LENGTH = 12;

// Obliga a reemplazar la contraseña temporal antes de usar la app.
export function InitialPasswordScreen({ onComplete }: { onComplete: (perfil: Perfil) => void }) {
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const changePassword = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert("Contraseña débil", `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      Alert.alert("No coincide", "Las contraseñas no son iguales.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("manage-users", {
        body: { action: "set-initial-password", newPassword: password },
      });
      if (error) throw error;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session?.user) throw new Error("La sesión expiró.");
      const profile = await getProfile(data.session.user.id);
      if (!profile || profile.must_change_password) {
        throw new Error("No se pudo confirmar el cambio inicial de contraseña.");
      }
      onComplete(profile);
    } catch (error) {
      console.error("Error al establecer la contraseña inicial:", error);
      Alert.alert("Error", "No se pudo cambiar la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "bold", marginBottom: 12 }}>
        Cambia tu contraseña
      </Text>
      <Text style={{ color: colors.subText, marginBottom: 20 }}>
        Debes reemplazar tu contraseña temporal por una nueva de al menos {MIN_PASSWORD_LENGTH} caracteres.
      </Text>
      <ThemedInput
        value={password}
        onChangeText={setPassword}
        placeholder="Nueva contraseña"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />
      <ThemedInput
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Confirmar contraseña"
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
      />
      <TouchableOpacity disabled={loading} onPress={changePassword} style={styles.bigOrangeButton}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.bigButtonText}>GUARDAR NUEVA CONTRASEÑA</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => supabase.auth.signOut()} style={{ padding: 14, alignItems: "center" }}>
        <Text style={{ color: colors.subText }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
