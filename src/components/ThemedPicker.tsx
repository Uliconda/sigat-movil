import { useState } from "react";
import { View } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { useTheme } from "../theme/useTheme";

export interface PickerItem {
  label: string;
  value: string;
}

interface ThemedPickerProps {
  value: string | null;
  items: PickerItem[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  modalTitle?: string;
  disabled?: boolean;
}

// Selector en modal con los colores del tema. Maneja internamente si está abierto.
// onChange solo se llama cuando el usuario elige una opción.
export function ThemedPicker({ value, items, onChange, placeholder, modalTitle, disabled = false }: ThemedPickerProps) {
  const { colors, isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);

  // Si el valor actual no está en la lista (p. ej. aún cargando), se agrega para mostrarlo.
  const options: PickerItem[] = value && !items.some((item) => item.value === value)
    ? [{ label: value, value }, ...items]
    : items;

  return (
    <View style={{ marginBottom: 15 }}>
      <DropDownPicker
        open={open}
        setOpen={setOpen}
        value={value}
        items={options}
        setValue={(next) => {
          const resolved = typeof next === "function" ? next(value) : next;
          if (resolved !== value) onChange(resolved);
        }}
        theme={isDarkMode ? "DARK" : "LIGHT"}
        placeholder={placeholder}
        disabled={disabled}
        listMode="MODAL"
        modalTitle={modalTitle}
        style={{ backgroundColor: disabled ? colors.disabledInput : colors.inputBg, borderColor: colors.border }}
        dropDownContainerStyle={{ backgroundColor: colors.inputBg, borderColor: colors.border }}
        textStyle={{ color: colors.text }}
        placeholderStyle={{ color: colors.placeholder }}
      />
    </View>
  );
}
