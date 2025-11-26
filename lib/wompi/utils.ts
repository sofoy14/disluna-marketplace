// lib/wompi/utils.ts
import crypto from 'crypto';
import { wompiConfig } from './config';

export interface TransactionData {
  reference: string;
  amount_in_cents: number;
  currency: string;
  expiration_time?: string;
}

/**
 * Genera una firma de integridad SHA256 para validar transacciones con Wompi
 */
export function generateIntegritySignature(data: TransactionData): string {
  const { reference, amount_in_cents, currency, expiration_time } = data;
  
  let concatenatedString = `${reference}${amount_in_cents}${currency}`;
  
  if (expiration_time) {
    concatenatedString += expiration_time;
  }
  
  concatenatedString += wompiConfig.integritySecret;
  
  return crypto.createHash('sha256').update(concatenatedString).digest('hex');
}

/**
 * Genera una referencia única para transacciones
 */
export function generateTransactionReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Genera una referencia única para invoices
 */
export function generateInvoiceReference(): string {
  return generateTransactionReference('INV');
}

/**
 * Genera una referencia única para retry de invoices
 */
export function generateRetryReference(invoiceId: string, attempt: number): string {
  const shortId = invoiceId.substring(0, 8);
  const timestamp = Date.now().toString(36);
  return `RETRY-${shortId}-${attempt}-${timestamp}`;
}

/**
 * Valida la firma de un webhook de Wompi
 */
export function validateWebhookSignature(payload: string, signature: string): boolean {
  if (!signature || !wompiConfig.webhookSecret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', wompiConfig.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}

/**
 * Convierte un monto en pesos colombianos a centavos
 */
export function formatAmountInCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convierte centavos a pesos colombianos
 */
export function formatAmountFromCents(cents: number): number {
  return cents / 100;
}

/**
 * Formatea un monto en pesos colombianos para mostrar
 */
export function formatCurrency(cents: number): string {
  const amount = formatAmountFromCents(cents);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Verifica si un payment source está disponible para cobros
 */
export function isPaymentSourceAvailable(status: string): boolean {
  return status === 'AVAILABLE';
}

/**
 * Genera datos de checkout para Web Checkout de Wompi
 */
export function generateCheckoutData(params: {
  planId: string;
  planName: string;
  amountInCents: number;
  workspaceId: string;
  userEmail: string;
  userName: string;
  redirectUrl?: string;
  expirationTime?: string;
}): Record<string, string> {
  const reference = generateTransactionReference('SUB');
  const signature = generateIntegritySignature({
    reference,
    amount_in_cents: params.amountInCents,
    currency: 'COP',
    expiration_time: params.expirationTime
  });

  const data: Record<string, string> = {
    'public-key': wompiConfig.publicKey,
    'currency': 'COP',
    'amount-in-cents': params.amountInCents.toString(),
    'reference': reference,
    'signature:integrity': signature,
    'redirect-url': params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
    'customer-data:email': params.userEmail,
    'customer-data:full-name': params.userName,
    'customer-data:legal-id-type': 'CC',
    'collect-customer-legal-id': 'true'
  };

  if (params.expirationTime) {
    data['expiration-time'] = params.expirationTime;
  }

  return data;
}

/**
 * Valida que una transacción esté en estado final
 */
export function isTransactionFinal(status: string): boolean {
  return ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'].includes(status);
}

/**
 * Valida que una transacción sea exitosa
 */
export function isTransactionSuccessful(status: string): boolean {
  return status === 'APPROVED';
}

/**
 * Obtiene el nombre legible de un método de pago
 */
export function getPaymentMethodName(type: string): string {
  const names: Record<string, string> = {
    'CARD': 'Tarjeta de Crédito/Débito',
    'NEQUI': 'Nequi',
    'PSE': 'PSE (Débito Bancario)',
    'BANCOLOMBIA_TRANSFER': 'Transferencia Bancolombia'
  };
  return names[type] || type;
}

/**
 * Calcula la fecha de expiración del checkout (15 minutos por defecto)
 */
export function getCheckoutExpirationTime(minutes: number = 15): string {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + minutes);
  return expirationDate.toISOString();
}
