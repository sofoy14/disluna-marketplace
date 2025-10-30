// lib/wompi/utils.ts
import crypto from 'crypto';
import { wompiConfig } from './config';

export interface TransactionData {
  reference: string;
  amount_in_cents: number;
  currency: string;
  expiration_time?: string;
}

export interface IntegritySignatureData extends TransactionData {
  integrity_secret: string;
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
  return `RETRY-${invoiceId}-${attempt}`;
}

/**
 * Valida la firma de un webhook de Wompi
 */
export function validateWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', wompiConfig.webhookSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
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
}) {
  const reference = generateTransactionReference('SUB');
  const signature = generateIntegritySignature({
    reference,
    amount_in_cents: params.amountInCents,
    currency: 'COP',
    expiration_time: params.expirationTime
  });

  return {
    'public-key': wompiConfig.publicKey,
    currency: 'COP',
    'amount-in-cents': params.amountInCents,
    reference,
    'signature:integrity': signature,
    'redirect-url': params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/billing/success`,
    'expiration-time': params.expirationTime,
    'customer-data:email': params.userEmail,
    'customer-data:full-name': params.userName,
    'customer-data:legal-id-type': 'CC',
    'collect-customer-legal-id': 'true'
  };
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


