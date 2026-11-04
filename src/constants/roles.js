// Deben coincidir con public.is_sigat_admin() / is_sigat_superadmin() en Supabase.
export const ROLES = {
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

const ROLES_ADMIN = [ROLES.ADMIN, ROLES.SUPERADMIN];

// Puede dar de alta, editar, dar de baja y organizar carpetas.
export const canManage = (userData) => ROLES_ADMIN.includes(userData?.rol);

// Puede eliminar equipos de forma permanente.
export const isSuperadmin = (userData) => userData?.rol === ROLES.SUPERADMIN;
