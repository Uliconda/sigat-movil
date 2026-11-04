import { useColorScheme } from "react-native";
import { BRAND, PALETTES } from "./colors";

// Tema único de la app: colores de marca + paleta clara u oscura según el sistema.
export function useTheme() {
  const isDarkMode = useColorScheme() === "dark";
  return {
    isDarkMode,
    colors: { ...BRAND, ...(isDarkMode ? PALETTES.dark : PALETTES.light) },
  };
}
