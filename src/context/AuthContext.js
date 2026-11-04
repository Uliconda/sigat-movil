import { createContext, useContext } from "react";

// user: sesión de Supabase Auth · userData: perfil SIGAT (nombre, rol, email).
export const AuthContext = createContext({ user: null, userData: null });

export const useAuth = () => useContext(AuthContext);
