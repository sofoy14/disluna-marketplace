/**
 * Configuración centralizada de WhatsApp
 * Número de WhatsApp: 321 638 9995
 */

export const WHATSAPP_NUMBER = "573216389995";
export const WHATSAPP_DISPLAY = "321 638 9995";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

/**
 * Genera un enlace de WhatsApp con un mensaje preformateado
 */
export function createWhatsAppLink(message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `${WHATSAPP_URL}?text=${encodedMessage}`;
}
