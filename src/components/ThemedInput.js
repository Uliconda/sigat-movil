import { Text, TextInput } from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Campo de texto con los colores del tema. Con editable={false} se ve deshabilitado.
export function ThemedInput({ style, multiline, editable = true, ...props }) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.placeholder}
      multiline={multiline}
      editable={editable}
      style={[
        styles.input,
        multiline && styles.textArea,
        {
          backgroundColor: editable ? colors.inputBg : colors.disabledInput,
          color: editable ? colors.text : colors.subText,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

// Etiqueta de campo de formulario.
export function FieldLabel({ children }) {
  const { colors } = useTheme();
  return <Text style={[styles.inputLabel, { color: colors.text }]}>{children}</Text>;
}

export function LabeledInput({ label, ...props }) {
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <ThemedInput {...props} />
    </>
  );
}
