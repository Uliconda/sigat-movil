import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LabeledInput } from "../components/ThemedInput";
import { supabase } from "../services/supabaseClient";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

export function LoginScreen() {
  const { colors, isDarkMode } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Por favor ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // Al iniciar sesión, App.js cambia de pantalla automáticamente.
    } catch (error) {
      console.error("Error al iniciar sesión en Supabase:", error);
      Alert.alert("Error de acceso", "No se pudo iniciar sesión. Verifica tu correo y contraseña.");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.loginContainer, { backgroundColor: colors.background }]}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Image
              source={require("../../assets/assets_buho.png")}
              style={{ width: 140, height: 140, resizeMode: "contain" }}
              accessibilityLabel="Logotipo de SIGAT"
            />
          </View>

          <Text style={[styles.loginTitle, { color: colors.text }]}>SIGAT</Text>
          <Text style={[styles.loginSubtitle, { color: colors.subText }]}>Sistema de Inventario</Text>

          <View style={[styles.loginCard, { backgroundColor: colors.card }]}>
            <LabeledInput
              label="Correo Electrónico"
              placeholder="admin@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <LabeledInput
              label="Contraseña"
              placeholder="********"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity style={styles.bigOrangeButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.bigButtonText}>INICIAR SESIÓN</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
