// lib/billing/feature-flags.ts
export const isBillingEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
};

export const isWompiEnabled = (): boolean => {
  return process.env.WOMPI_ENVIRONMENT !== undefined && 
         process.env.WOMPI_PUBLIC_KEY !== undefined && 
         process.env.WOMPI_PRIVATE_KEY !== undefined;
};

export const getBillingConfig = () => {
  return {
    enabled: isBillingEnabled(),
    wompiEnabled: isWompiEnabled(),
    environment: process.env.WOMPI_ENVIRONMENT || 'sandbox',
    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
    baseUrl: process.env.NEXT_PUBLIC_WOMPI_BASE_URL || 'https://sandbox.wompi.co'
  };
};


