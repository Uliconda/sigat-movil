import type { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import type { Perfil } from "../types";

export interface AuthState {
  /** Sesión de Supabase Auth. */
  user: User | null;
  /** Perfil SIGAT (nombre, rol, email). */
  userData: Perfil | null;
}

export const AuthContext = createContext<AuthState>({ user: null, userData: null });

export const useAuth = () => useContext(AuthContext);
