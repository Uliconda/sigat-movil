import type { Perfil, Rol } from "../types";

// Deben coincidir con public.is_sigat_admin() / is_sigat_superadmin() en Supabase.
export const ROLES = {
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const satisfies Record<string, Rol>;

const ROLES_ADMIN: readonly Rol[] = [ROLES.ADMIN, ROLES.SUPERADMIN];

type ConRol = Pick<Perfil, "rol"> | { rol?: string } | null | undefined;

// Puede dar de alta, editar, dar de baja y organizar carpetas.
export const canManage = (userData: ConRol): boolean =>
  ROLES_ADMIN.includes(userData?.rol as Rol);

// Puede eliminar equipos de forma permanente.
export const isSuperadmin = (userData: ConRol): boolean => userData?.rol === ROLES.SUPERADMIN;
