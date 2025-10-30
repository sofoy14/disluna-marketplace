/**
 * Verifica si un email tiene permisos de administrador
 * Los emails de administrador se configuran en la variable de entorno ADMIN_EMAILS
 * separados por comas
 */

export function isAdmin(email: string | undefined): boolean {
  if (!email) return false

  const adminEmails = process.env.ADMIN_EMAILS || ""
  
  if (!adminEmails) {
    console.warn("ADMIN_EMAILS no está configurado en las variables de entorno")
    return false
  }

  const allowedEmails = adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return allowedEmails.includes(email.toLowerCase())
}

export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || ""
  return adminEmails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
}

