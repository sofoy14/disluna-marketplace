// lib/wompi/utils.ts
import crypto from 'crypto';
import { wompiConfig } from './config';

export interface WompiEvent {
  event: string;
  data: any;
  sent_at: string;
  signature: {
    checksum: string;
    properties: string[];
  };
}

export interface WompiTransaction {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
  amount_in_cents: number;
  reference: string;
  payment_method_type: string;
  customer_email: string;
  finalized_at?: string;
  status_message?: string;
}

export interface WompiPaymentSource {
  id: string;
  type: 'CARD' | 'NEQUI';
  status: 'PENDING' | 'AVAILABLE' | 'UNAVAILABLE';
  public_data?: {
    brand?: string;
    last_four?: string;
    card_holder?: string;
    exp_year?: string;
    exp_month?: string;
  };
}

export interface WompiToken {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
}

export interface WompiMerchant {
  presigned_acceptance: {
    acceptance_token: string;
    permalink: string;
    type: string;
  };
}

/**
 * Validates webhook signature from Wompi
 */
export function validateWebhookSignature(event: WompiEvent): boolean {
  const { properties, checksum } = event.signature;
  let concatString = '';
  
  // 1. Concatenar valores según 'properties'
  for (const prop of properties) {
    const value = getNestedValue(event.data, prop);
    concatString += String(value ?? '');
  }
  
  // 2. Agregar sent_at y event
  concatString += event.sent_at + event.event;
  
  // 3. Agregar secreto
  concatString += wompiConfig.eventsSecret;
  
  // 4. Hash SHA-256
  const calculatedChecksum = crypto.createHash('sha256').update(concatString).digest('hex');
  
  // 5. Comparar
  return calculatedChecksum === checksum;
}

/**
 * Gets nested value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Generates unique reference for transactions
 */
export function generateTransactionReference(invoiceId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  return `INV-${invoiceId}-${ts}`;
}

/**
 * Generates retry reference for failed transactions
 */
export function generateRetryReference(invoiceId: string, attempt: number): string {
  return `INV-${invoiceId}-retry-${attempt}-${Date.now()}`;
}

/**
 * Formats amount from cents to COP currency
 */
export function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amountInCents);
}

/**
 * Calculates days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculates proration for plan changes
 */
export function calculateProration(
  currentPlanAmount: number,
  newPlanAmount: number,
  daysRemaining: number,
  daysInPeriod: number = 30
): { credit: number; chargeNow: number } {
  const currentPlanDaily = currentPlanAmount / daysInPeriod;
  const newPlanDaily = newPlanAmount / daysInPeriod;
  
  const credit = Math.floor(currentPlanDaily * daysRemaining);
  const chargeNow = Math.max(0, newPlanAmount - credit);
  
  return { credit, chargeNow };
}

/**
 * Gets next retry date based on attempt count
 */
export function getNextRetryDate(attemptCount: number): Date {
  const retryDays = [2, 5, 9]; // Día +2, +5, +9
  const daysToAdd = retryDays[attemptCount] || 12; // Default to +12 if more than 3 attempts
  
  const nextRetry = new Date();
  nextRetry.setDate(nextRetry.getDate() + daysToAdd);
  return nextRetry;
}

/**
 * Checks if payment source is available for charging
 */
export function isPaymentSourceAvailable(status: string): boolean {
  return status === 'AVAILABLE';
}

/**
 * Checks if transaction is successful
 */
export function isTransactionSuccessful(status: string): boolean {
  return status === 'APPROVED';
}

/**
 * Checks if transaction failed and should be retried
 */
export function shouldRetryTransaction(status: string): boolean {
  return status === 'DECLINED' || status === 'ERROR';
}

/**
 * Gets human-readable status message
 */
export function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'PENDING': 'Procesando...',
    'APPROVED': 'Aprobado',
    'DECLINED': 'Rechazado',
    'ERROR': 'Error del sistema',
    'VOIDED': 'Anulado',
    'AVAILABLE': 'Disponible',
    'UNAVAILABLE': 'No disponible'
  };
  
  return messages[status] || status;
}


