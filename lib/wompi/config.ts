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

// Validate configuration
export const validateWompiConfig = (): { isValid: boolean; missingFields: string[] } => {
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
