import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../theme/styles";
import { useTheme } from "../theme/useTheme";

// Modal con formulario corto: título, campos (children) y botones Cancelar / Confirmar.
export function FormModal({
  visible,
  title,
  subtitle,
  children,
  confirmLabel = "Confirmar",
  confirmColor,
  onConfirm,
  onCancel,
  loading = false,
  animationType = "fade",
}) {
  const { colors } = useTheme();

  return (
    <Modal animationType={animationType} transparent visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.modalOverlay, { flexGrow: 1, backgroundColor: colors.overlay }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.modalView, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.modalSubtitle, { color: colors.subText }]}>{subtitle}</Text>
            ) : (
              <View style={{ height: 15 }} />
            )}

            {children}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.disabled }]}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.textStyle}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: confirmColor ?? colors.primary }]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.textStyle}>{confirmLabel}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
