import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { type TextInputProps, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/useTheme";
import { FieldLabel, ThemedInput } from "./ThemedInput";

type PasswordInputProps = Omit<TextInputProps, "secureTextEntry"> & { label?: string };

// Campo de contraseña con un botón (ojo) para mostrar u ocultar lo escrito.
export function PasswordInput({ label, style, ...props }: PasswordInputProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View style={{ marginBottom: 15, justifyContent: "center" }}>
        <ThemedInput
          {...props}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          // Deja espacio para el botón y anula el margen del campo (lo pone el contenedor).
          style={[{ paddingRight: 52, marginBottom: 0 }, style]}
        />
        <TouchableOpacity
          onPress={() => setVisible((actual) => !actual)}
          style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 52, alignItems: "center", justifyContent: "center" }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          accessibilityState={{ checked: visible }}
        >
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.subText} />
        </TouchableOpacity>
      </View>
    </>
  );
}
