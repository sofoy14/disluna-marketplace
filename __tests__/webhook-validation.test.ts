// __tests__/webhook-validation.test.ts
import { POST } from '@/app/api/wompi/webhook/route';
import { NextRequest } from 'next/server';
import { computeWompiWebhookSignature } from '@/src/integrations/wompi/webhook';

// Mock dependencies
jest.mock('@/lib/supabase/server-client', () => ({
  getSupabaseServer: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve(null)),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [] })),
      })),
      update: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}));

jest.mock('@/db/invoices');
jest.mock('@/db/subscriptions');
jest.mock('@/db/transactions');
jest.mock('@/db/payment-sources');
jest.mock('@/lib/billing/email-notifications');
jest.mock('@/lib/wompi/client');
jest.mock('@/src/integrations/wompi/webhook-event-store');

describe('Wompi Webhook Signature Validation', () => {
  const webhookSecret = 'test_webhook_secret';
  const validPayload = JSON.stringify({
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'txn_123',
        reference: 'SUB-123',
        status: 'APPROVED',
        amount_in_cents: 10000,
        customer_email: 'test@example.com',
        payment_method_type: 'CARD',
      },
    },
  });

  beforeEach(() => {
    process.env.WOMPI_WEBHOOK_SECRET = webhookSecret;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.WOMPI_WEBHOOK_SECRET;
  });

  describe('Signature Validation', () => {
    it('should reject request without signature', async () => {
      const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
        method: 'POST',
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe('Missing webhook signature');
    });

    it('should reject request with invalid signature', async () => {
      const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
        method: 'POST',
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
          'x-event-checksum': 'invalid_signature_12345',
        },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(req);
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe('Invalid webhook signature');

      // Verify security logging occurred
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Invalid webhook signature:',
        expect.objectContaining({
          signaturePresent: true,
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should accept request with valid HMAC-SHA256 signature', async () => {
      // Generate valid signature
      const signature = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
        method: 'POST',
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
          'x-event-checksum': signature,
        },
      });

      const response = await POST(req);

      // Should not reject signature (may fail for other reasons in tests)
      expect(response.status).not.toBe(401);
    });

    it('should reject when WOMPI_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.WOMPI_WEBHOOK_SECRET;

      const signature = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
        method: 'POST',
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
          'x-event-checksum': signature,
        },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(req);
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json.error).toBe('Server configuration error');

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ WOMPI_WEBHOOK_SECRET not configured'
      );

      consoleSpy.mockRestore();
    });

    it('should accept signature from different header names', async () => {
      const signature = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      const headerVariations = [
        'x-event-checksum',
        'X-Event-Checksum',
        'x-wompi-signature',
        'wompi-signature',
      ];

      for (const headerName of headerVariations) {
        const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
          method: 'POST',
          body: validPayload,
          headers: {
            'Content-Type': 'application/json',
            [headerName]: signature,
          },
        });

        const response = await POST(req);
        // Should not reject signature
        expect(response.status).not.toBe(401);
      }
    });
  });

  describe('Signature Generation', () => {
    it('should generate consistent HMAC-SHA256 signatures', () => {
      const signature1 = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      const signature2 = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/); // 64 character hex string
    });

    it('should generate different signatures for different payloads', () => {
      const signature1 = computeWompiWebhookSignature({
        payload: validPayload,
        secret: webhookSecret,
      });

      const signature2 = computeWompiWebhookSignature({
        payload: JSON.stringify({ event: 'different.event' }),
        secret: webhookSecret,
      });

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = computeWompiWebhookSignature({
        payload: validPayload,
        secret: 'secret1',
      });

      const signature2 = computeWompiWebhookSignature({
        payload: validPayload,
        secret: 'secret2',
      });

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('Security Logging', () => {
    it('should log relevant security information on signature failure', async () => {
      const req = new NextRequest('http://localhost:3000/api/wompi/webhook', {
        method: 'POST',
        body: validPayload,
        headers: {
          'Content-Type': 'application/json',
          'x-event-checksum': 'bad_signature',
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'test-agent',
        },
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await POST(req);

      const loggedData = consoleSpy.mock.calls[0][1] as any;
      expect(loggedData).toMatchObject({
        signaturePresent: true,
        signatureLength: 13,
        bodyLength: validPayload.length,
        ip: '192.168.1.100',
        userAgent: 'test-agent',
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
    });
  });
});
