import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { createElement } from "react";
import App from "./App";
import { ConfigErrorScreen } from "./src/screens/ConfigErrorScreen";
import { supabaseConfigError } from "./src/services/supabaseClient";

// Punto de entrada. Si la compilación no trae la configuración de Supabase se
// muestra una pantalla explicativa en lugar de que la app se cierre.
function ConfigError() {
  return createElement(ConfigErrorScreen, { message: supabaseConfigError ?? "" });
}

registerRootComponent(supabaseConfigError ? ConfigError : App);
