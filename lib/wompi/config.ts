// lib/wompi/config.ts
export interface WompiConfig {
  environment: 'sandbox' | 'production';
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  webhookSecret: string;
  baseUrl: string;
  isEnabled: boolean;
}

export const wompiConfig: WompiConfig = {
  environment: (process.env.WOMPI_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
  privateKey: process.env.WOMPI_PRIVATE_KEY || '',
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET || '',
  webhookSecret: process.env.WOMPI_WEBHOOK_SECRET || '',
  baseUrl: process.env.NEXT_PUBLIC_WOMPI_BASE_URL || 'https://sandbox.wompi.co',
  isEnabled: true // Sistema de pagos activado
};

// Validate configuration for Web Checkout (minimal required fields)
export const validateWompiConfig = (): { isValid: boolean; missingFields: string[] } => {
  if (!wompiConfig.isEnabled) {
    return { isValid: true, missingFields: [] };
  }

  // Para Web Checkout solo necesitamos publicKey e integritySecret
  // webhookSecret es para validar webhooks entrantes, no para crear transacciones
  const requiredFields = [
    'publicKey',
    'integritySecret'
  ];
  
  const missingFields = requiredFields.filter(field => !wompiConfig[field as keyof WompiConfig]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

// Validate full configuration (including webhook)
export const validateFullWompiConfig = (): { isValid: boolean; missingFields: string[] } => {
  if (!wompiConfig.isEnabled) {
    return { isValid: true, missingFields: [] };
  }

  const requiredFields = [
    'publicKey',
    'privateKey', 
    'integritySecret',
    'webhookSecret'
  ];
  
  const missingFields = requiredFields.filter(field => !wompiConfig[field as keyof WompiConfig]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

export const getWompiApiUrl = (endpoint: string): string => {
  return `${wompiConfig.baseUrl}/v1${endpoint}`;
};

export const getWompiCheckoutUrl = (): string => {
  // La URL de checkout de Wompi es siempre https://checkout.wompi.co/p/
  // No depende del ambiente (sandbox o production)
  return 'https://checkout.wompi.co/p/';
};

// Helper para debugging
export const getWompiConfigStatus = () => {
  return {
    environment: wompiConfig.environment,
    hasPublicKey: !!wompiConfig.publicKey,
    hasPrivateKey: !!wompiConfig.privateKey,
    hasIntegritySecret: !!wompiConfig.integritySecret,
    hasWebhookSecret: !!wompiConfig.webhookSecret,
    baseUrl: wompiConfig.baseUrl,
    publicKeyPrefix: wompiConfig.publicKey ? wompiConfig.publicKey.substring(0, 15) + '...' : 'NOT SET'
  };
};
