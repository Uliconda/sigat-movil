import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "./src/context/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { InitialPasswordScreen } from "./src/screens/InitialPasswordScreen";
import { supabase } from "./src/services/supabaseClient";
import { getProfile, startSyncMonitor } from "./src/services/supabaseData";
import { useTheme } from "./src/theme/useTheme";
import type { Perfil } from "./src/types";

// Restaura la sesión de Supabase y carga el perfil SIGAT de la cuenta activa.
function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Perfil | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let requestId = 0;

    // El token solo se renueva mientras la app está en primer plano.
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    const applySession = async (session: Session | null) => {
      const currentRequest = ++requestId;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setUserData(null);
      setAuthError(null);

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const profile = await getProfile(currentUser.id);
        if (!active || currentRequest !== requestId) return;
        if (!profile) throw new Error("Esta cuenta no tiene un perfil SIGAT.");
        setUserData(profile);
      } catch (error) {
        if (!active || currentRequest !== requestId) return;
        console.error("Error al obtener el perfil de Supabase:", error);
        setAuthError("No se pudo cargar el perfil SIGAT. Verifica tu conexión e inténtalo de nuevo.");
      } finally {
        if (active && currentRequest === requestId) setIsLoading(false);
      }
    };

    const handleRestoreError = (error: unknown) => {
      if (!active) return;
      console.error("Error al restaurar la sesión de Supabase:", error);
      setAuthError("No se pudo restaurar la sesión.");
      setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) return handleRestoreError(error);
      void applySession(data.session);
    }).catch(handleRestoreError);

    // setTimeout: Supabase recomienda no llamar a la API dentro del callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) void applySession(session);
      }, 0);
    });

    return () => {
      active = false;
      requestId += 1;
      subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return { user, userData, setUserData, authError, isLoading };
}

function ProfileErrorScreen({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text, marginBottom: 16 }}>{message}</Text>
      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={{ color: colors.primary, fontWeight: "bold" }}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const { colors } = useTheme();
  const { user, userData, setUserData, authError, isLoading } = useSession();

  // Sincroniza los cambios hechos sin conexión mientras haya una sesión activa.
  useEffect(() => {
    if (!user?.id || userData?.must_change_password) return undefined;
    return startSyncMonitor(user.id);
  }, [user?.id, userData?.must_change_password]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let content;
  if (user && userData?.must_change_password) {
    content = <InitialPasswordScreen onComplete={setUserData} />;
  } else if (user && authError) {
    content = <ProfileErrorScreen message={authError} />;
  } else {
    content = <AppNavigator user={user} />;
  }

  return <AuthContext.Provider value={{ user, userData }}>{content}</AuthContext.Provider>;
}
