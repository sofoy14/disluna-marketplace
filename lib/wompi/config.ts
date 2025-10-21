// lib/wompi/config.ts
export const wompiConfig = {
  environment: process.env.WOMPI_ENVIRONMENT || 'sandbox',
  publicKey: process.env.WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  eventsSecret: process.env.WOMPI_EVENTS_SECRET || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  baseUrl: process.env.WOMPI_ENVIRONMENT === 'production' 
    ? 'https://production.wompi.co' 
    : 'https://sandbox.wompi.co',
  cronSecret: process.env.CRON_SECRET || '',
  isEnabled: process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true'
} as const;

export const wompiEndpoints = {
  merchants: (publicKey: string) => `/v1/merchants/${publicKey}`,
  tokens: {
    cards: '/v1/tokens/cards',
    nequi: '/v1/tokens/nequi'
  },
  paymentSources: '/v1/payment_sources',
  transactions: '/v1/transactions',
  transactionById: (id: string) => `/v1/transactions/${id}`
} as const;

export function getWompiUrl(endpoint: string): string {
  return `${wompiConfig.baseUrl}${endpoint}`;
}
