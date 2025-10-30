// lib/wompi/client.ts
import { wompiConfig, getWompiApiUrl } from './config';

export interface WompiTransaction {
  id: string;
  amount_in_cents: number;
  currency: string;
  reference: string;
  status: string;
  status_message: string;
  payment_method_type: string;
  payment_source_id?: string;
  customer_email: string;
  created_at: string;
  finalized_at?: string;
  raw_payload?: any;
}

export interface WompiPaymentSource {
  id: string;
  type: string;
  status: string;
  customer_email: string;
  last_four?: string;
  expires_at?: string;
  created_at: string;
}

export interface WompiAcceptanceToken {
  data: {
    presigned_acceptance: {
      acceptance_token: string;
      permalink: string;
      type: string;
    };
  };
}

export interface CreateTransactionRequest {
  amount_in_cents: number;
  currency: string;
  customer_email: string;
  payment_method: {
    type: string;
    installments?: number;
  };
  payment_source_id?: string;
  reference: string;
  redirect_url?: string;
  recurrent?: boolean;
}

export interface CreatePaymentSourceRequest {
  type: string;
  token: string;
  customer_email: string;
  acceptance_token: string;
}

class WompiClient {
  private baseUrl: string;
  private privateKey: string;

  constructor() {
    this.baseUrl = wompiConfig.baseUrl;
    this.privateKey = wompiConfig.privateKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = getWompiApiUrl(endpoint);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.privateKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Wompi API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Obtiene el token de aceptación de términos
   */
  async getAcceptanceToken(): Promise<WompiAcceptanceToken> {
    return this.makeRequest<WompiAcceptanceToken>('/merchants/acceptance_token');
  }

  /**
   * Crea una transacción en Wompi
   */
  async createTransaction(data: CreateTransactionRequest): Promise<WompiTransaction> {
    const response = await this.makeRequest<{ data: WompiTransaction }>(
      '/transactions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    return response.data;
  }

  /**
   * Obtiene los detalles de una transacción
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    const response = await this.makeRequest<{ data: WompiTransaction }>(
      `/transactions/${transactionId}`
    );

    return response.data;
  }

  /**
   * Crea una fuente de pago tokenizada
   */
  async createPaymentSource(data: CreatePaymentSourceRequest): Promise<WompiPaymentSource> {
    const response = await this.makeRequest<{ data: WompiPaymentSource }>(
      '/payment_sources',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    return response.data;
  }

  /**
   * Obtiene los detalles de una fuente de pago
   */
  async getPaymentSource(paymentSourceId: string): Promise<WompiPaymentSource> {
    const response = await this.makeRequest<{ data: WompiPaymentSource }>(
      `/payment_sources/${paymentSourceId}`
    );

    return response.data;
  }

  /**
   * Lista las fuentes de pago de un comercio
   */
  async getPaymentSources(): Promise<WompiPaymentSource[]> {
    const response = await this.makeRequest<{ data: WompiPaymentSource[] }>(
      '/payment_sources'
    );

    return response.data;
  }

  /**
   * Valida una transacción usando el ID de referencia
   */
  async validateTransactionByReference(reference: string): Promise<WompiTransaction | null> {
    try {
      const response = await this.makeRequest<{ data: WompiTransaction[] }>(
        `/transactions?reference=${encodeURIComponent(reference)}`
      );

      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error validating transaction by reference:', error);
      return null;
    }
  }

  /**
   * Obtiene información del comercio
   */
  async getMerchantInfo(): Promise<any> {
    return this.makeRequest('/merchants');
  }
}

// Export singleton instance
export const wompiClient = new WompiClient();





