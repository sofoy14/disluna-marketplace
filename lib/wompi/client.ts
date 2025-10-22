// lib/wompi/client.ts
import { wompiConfig, getWompiUrl, wompiEndpoints } from './config';
import { 
  WompiMerchant, 
  WompiToken, 
  WompiPaymentSource, 
  WompiTransaction 
} from './utils';

export class WompiClient {
  private baseUrl: string;
  private publicKey: string;
  private privateKey: string;

  constructor() {
    this.baseUrl = wompiConfig.baseUrl;
    this.publicKey = wompiConfig.publicKey;
    this.privateKey = wompiConfig.privateKey;
  }

  /**
   * Get merchant information and acceptance tokens
   */
  async getMerchant(): Promise<WompiMerchant> {
    const url = getWompiUrl(wompiEndpoints.merchants(this.publicKey));
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get merchant info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Tokenize a credit card
   */
  async tokenizeCard(cardData: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }): Promise<WompiToken> {
    const url = getWompiUrl(wompiEndpoints.tokens.cards);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.publicKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to tokenize card: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Tokenize a Nequi payment
   */
  async tokenizeNequi(phoneNumber: string): Promise<WompiToken> {
    const url = getWompiUrl(wompiEndpoints.tokens.nequi);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.publicKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone_number: phoneNumber })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to tokenize Nequi: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a payment source from token
   */
  async createPaymentSource(sourceData: {
    type: 'CARD' | 'NEQUI';
    token: string;
    customer_email: string;
    acceptance_token: string;
    accept_personal_auth: string;
  }): Promise<WompiPaymentSource> {
    const url = getWompiUrl(wompiEndpoints.paymentSources);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sourceData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create payment source: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a transaction using payment source
   */
  async createTransaction(transactionData: {
    amount_in_cents: number;
    currency: string;
    customer_email: string;
    payment_method: {
      type: string;
      installments: number;
    };
    payment_source_id: string;
    reference: string;
    recurrent?: boolean;
    redirect_url?: string;
  }): Promise<WompiTransaction> {
    const url = getWompiUrl(wompiEndpoints.transactions);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create transaction: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    const url = getWompiUrl(wompiEndpoints.transactionById(transactionId));
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get transaction: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get payment source by ID
   */
  async getPaymentSource(sourceId: string): Promise<WompiPaymentSource> {
    const url = getWompiUrl(`${wompiEndpoints.paymentSources}/${sourceId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get payment source: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }
}

// Export singleton instance
export const wompiClient = new WompiClient();


