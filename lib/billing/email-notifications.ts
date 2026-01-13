// lib/billing/email-notifications.ts
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const emailTemplates = {
  paymentSuccess: (invoice: any): EmailTemplate => ({
    subject: `Pago exitoso - Factura ${invoice.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">✅ Pago Exitoso</h2>
        <p>Hola,</p>
        <p>Tu pago de <strong>${formatCurrency(invoice.amount_in_cents)}</strong> ha sido procesado exitosamente.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalles del Pago</h3>
          <p><strong>Factura:</strong> ${invoice.id}</p>
          <p><strong>Período:</strong> ${new Date(invoice.period_start).toLocaleDateString('es-CO')} - ${new Date(invoice.period_end).toLocaleDateString('es-CO')}</p>
          <p><strong>Monto:</strong> ${formatCurrency(invoice.amount_in_cents)}</p>
          <p><strong>Fecha de pago:</strong> ${new Date(invoice.paid_at).toLocaleDateString('es-CO')}</p>
        </div>
        <p>Gracias por tu confianza. Tu suscripción está activa.</p>
        <p>Saludos,<br>El equipo de Asistente Legal Inteligente</p>
      </div>
    `,
    text: `Pago exitoso de ${formatCurrency(invoice.amount_in_cents)}. Factura ${invoice.id}. Período: ${new Date(invoice.period_start).toLocaleDateString('es-CO')} - ${new Date(invoice.period_end).toLocaleDateString('es-CO')}.`
  }),

  paymentFailed: (invoice: any, attempt: number): EmailTemplate => ({
    subject: `Pago rechazado - Intento ${attempt} de 3`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Pago Rechazado</h2>
        <p>Hola,</p>
        <p>Tu pago de <strong>${formatCurrency(invoice.amount_in_cents)}</strong> no pudo ser procesado.</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3>Detalles del Pago</h3>
          <p><strong>Factura:</strong> ${invoice.id}</p>
          <p><strong>Monto:</strong> ${formatCurrency(invoice.amount_in_cents)}</p>
          <p><strong>Intento:</strong> ${attempt} de 3</p>
          <p><strong>Próximo intento:</strong> ${attempt < 3 ? 'En 2 días' : 'No hay más intentos automáticos'}</p>
        </div>
        ${attempt < 3 ? `
          <p><strong>¿Qué puedes hacer?</strong></p>
          <ul>
            <li>Verifica que tu método de pago tenga fondos suficientes</li>
            <li>Actualiza tu método de pago si es necesario</li>
            <li>Contacta a tu banco si el problema persiste</li>
          </ul>
        ` : `
          <p><strong>Acción requerida:</strong></p>
          <p>Tu suscripción será suspendida si no actualizas tu método de pago. <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="color: #3b82f6;">Actualizar método de pago</a></p>
        `}
        <p>Si tienes preguntas, contáctanos.</p>
        <p>Saludos,<br>El equipo de Asistente Legal Inteligente</p>
      </div>
    `,
    text: `Pago rechazado de ${formatCurrency(invoice.amount_in_cents)}. Intento ${attempt} de 3. ${attempt < 3 ? 'Próximo intento en 2 días.' : 'Actualiza tu método de pago.'}`
  }),

  subscriptionSuspended: (subscription: any): EmailTemplate => ({
    subject: 'Suscripción suspendida - Acción requerida',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">🚫 Suscripción Suspendida</h2>
        <p>Hola,</p>
        <p>Tu suscripción ha sido suspendida debido a fallos repetidos en el procesamiento del pago.</p>
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3>Detalles de la Suscripción</h3>
          <p><strong>Plan:</strong> ${subscription.plans?.name || 'N/A'}</p>
          <p><strong>Estado:</strong> Suspendida</p>
          <p><strong>Fecha de suspensión:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
        </div>
        <p><strong>Para reactivar tu suscripción:</strong></p>
        <ol>
          <li>Actualiza tu método de pago</li>
          <li>Realiza el pago pendiente</li>
          <li>Tu acceso será restaurado inmediatamente</li>
        </ol>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Actualizar Método de Pago</a>
        </div>
        <p>Si necesitas ayuda, contáctanos.</p>
        <p>Saludos,<br>El equipo de Asistente Legal Inteligente</p>
      </div>
    `,
    text: `Suscripción suspendida. Actualiza tu método de pago para reactivar: ${process.env.NEXT_PUBLIC_APP_URL}/billing`
  }),

  paymentMethodExpiring: (paymentSource: any): EmailTemplate => ({
    subject: 'Tu método de pago está próximo a vencer',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Método de Pago Próximo a Vencer</h2>
        <p>Hola,</p>
        <p>Tu método de pago está próximo a vencer y necesita ser actualizado.</p>
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3>Detalles del Método de Pago</h3>
          <p><strong>Tipo:</strong> ${paymentSource.type}</p>
          <p><strong>Últimos 4 dígitos:</strong> •••• ${paymentSource.last_four}</p>
          <p><strong>Fecha de vencimiento:</strong> ${new Date(paymentSource.expires_at).toLocaleDateString('es-CO')}</p>
        </div>
        <p><strong>Para evitar interrupciones en tu servicio:</strong></p>
        <ol>
          <li>Actualiza tu método de pago antes de la fecha de vencimiento</li>
          <li>Tu suscripción continuará sin interrupciones</li>
        </ol>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Actualizar Método de Pago</a>
        </div>
        <p>Si tienes preguntas, contáctanos.</p>
        <p>Saludos,<br>El equipo de Asistente Legal Inteligente</p>
      </div>
    `,
    text: `Método de pago próximo a vencer (${new Date(paymentSource.expires_at).toLocaleDateString('es-CO')}). Actualiza en: ${process.env.NEXT_PUBLIC_APP_URL}/billing`
  }),

  workspaceInvitation: (invitationData: { workspaceName: string, inviteUrl: string, invitedBy: string }): EmailTemplate => ({
    subject: `Te han invitado a colaborar en "${invitationData.workspaceName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
        <h2 style="color: #6366f1; text-align: center;">🤝 Invitación a Workspace</h2>
        <p>Hola,</p>
        <p><strong>${invitationData.invitedBy}</strong> te ha invitado a colaborar en el espacio de trabajo <strong>"${invitationData.workspaceName}"</strong>.</p>
        <div style="background: #f3f4f6; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
          <h3 style="margin-top: 0;">¿Listo para empezar?</h3>
          <p>Haz clic en el botón de abajo para aceptar la invitación y unirte al equipo.</p>
          <a href="${invitationData.inviteUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 10px;">Aceptar Invitación</a>
        </div>
        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Este enlace expirará en 7 días.<br>
          Si no esperabas esta invitación, puedes ignorar este correo.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          © ${new Date().getFullYear()} Asistente Legal Inteligente. Todos los derechos reservados.
        </p>
      </div>
    `,
    text: `Te han invitado a colaborar en "${invitationData.workspaceName}". Acepta la invitación aquí: ${invitationData.inviteUrl}`
  })
};

// Función helper para formatear moneda
function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountInCents);
}

// Función para enviar emails (implementar según tu proveedor de email)
export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  // Implementar según tu proveedor de email (SendGrid, Resend, etc.)
  console.log(`Sending email to ${to}:`, template.subject);

  // Ejemplo con fetch a tu API de email
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
    // En producción, podrías querer usar un servicio de cola como BullMQ
    // para reintentar el envío de emails
  }
}




