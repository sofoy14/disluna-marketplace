// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json();

    // Validar campos requeridos
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }

    // TODO: Implementar con tu proveedor de email preferido
    // Opciones populares:
    // - SendGrid: https://sendgrid.com/
    // - Resend: https://resend.com/
    // - AWS SES: https://aws.amazon.com/ses/
    // - Mailgun: https://www.mailgun.com/

    // Ejemplo con Resend (recomendado para Next.js)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'Asistente Legal <noreply@tu-dominio.com>',
      to: [to],
      subject,
      html,
      text
    });

    if (error) {
      throw new Error(error.message);
    }
    */

    // Por ahora, solo logueamos el email (reemplazar con implementación real)
    console.log('Email que se enviaría:', {
      to,
      subject,
      html: html.substring(0, 100) + '...',
      text: text?.substring(0, 100) + '...'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      // id: data?.id // Si usas Resend
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' }, 
      { status: 500 }
    );
  }
}





