/**
 * Sistema de autenticación para el panel de administración
 * Token de acceso: 12062026
 */

const ADMIN_TOKEN = "12062026";
const SESSION_KEY = "disluna_admin_session";

/**
 * Verifica si el token proporcionado es válido
 */
export function verifyToken(token: string): boolean {
  return token === ADMIN_TOKEN;
}

/**
 * Guarda la sesión de administrador en sessionStorage
 */
export function createAdminSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
  }
}

/**
 * Verifica si hay una sesión activa de administrador
 */
export function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

/**
 * Elimina la sesión de administrador
 */
export function destroyAdminSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Hook para usar autenticación de admin
 */
export function useAdminAuth() {
  return {
    isAuthenticated: hasActiveSession(),
    login: (token: string) => {
      if (verifyToken(token)) {
        createAdminSession();
        return true;
      }
      return false;
    },
    logout: () => {
      destroyAdminSession();
    },
  };
}
