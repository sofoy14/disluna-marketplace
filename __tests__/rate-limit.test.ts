// __tests__/rate-limit.test.ts
import {
  checkRateLimit,
  formatRateLimitHeaders,
  getIdentifierFromRequest,
} from '@/lib/rate-limit';

// Mock the Upstash modules
jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    }),
  })),
}));

jest.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: jest.fn().mockReturnValue({
      // Mock Redis client
    }),
  },
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should return success when rate limit is not exceeded', async () => {
      const result = await checkRateLimit('test-identifier', {
        limit: jest.fn().mockResolvedValue({
          success: true,
          limit: 10,
          remaining: 9,
          reset: Date.now() + 60000,
        }),
      } as any);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should return failure when rate limit is exceeded', async () => {
      const result = await checkRateLimit('test-identifier', {
        limit: jest.fn().mockResolvedValue({
          success: false,
          limit: 10,
          remaining: 0,
          reset: Date.now() + 60000,
        }),
      } as any);

      expect(result.success).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(0);
    });

    it('should return success when rate limiter is not configured', async () => {
      const result = await checkRateLimit('test-identifier', null);

      expect(result.success).toBe(true);
      expect(result.limit).toBeUndefined();
    });

    it('should handle rate limit check errors gracefully', async () => {
      const mockLimiter = {
        limit: jest.fn().mockRejectedValue(new Error('Redis connection error')),
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkRateLimit('test-identifier', mockLimiter as any);

      expect(result.success).toBe(true); // Should allow on error
      expect(consoleSpy).toHaveBeenCalledWith(
        'Rate limit check failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('formatRateLimitHeaders', () => {
    it('should format headers with all fields', () => {
      const headers = formatRateLimitHeaders({
        limit: 100,
        remaining: 50,
        reset: Date.now() + 30000,
      });

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeDefined();
    });

    it('should handle missing fields', () => {
      const headers = formatRateLimitHeaders({
        limit: 100,
      });

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBeUndefined();
      expect(headers['X-RateLimit-Reset']).toBeUndefined();
    });

    it('should calculate retry-after correctly', () => {
      const resetTime = Date.now() + 5000;
      const headers = formatRateLimitHeaders({
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      const retryAfter = parseInt(headers['Retry-After'] as string);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(5); // Should be ~5 seconds
    });
  });

  describe('getIdentifierFromRequest', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-forwarded-for') return '192.168.1.1, 10.0.0.1';
            if (header === 'x-real-ip') return null;
            return null;
          }),
        },
      } as any;

      const identifier = getIdentifierFromRequest(mockRequest);
      expect(identifier).toBe('192.168.1.1');
    });

    it('should fallback to x-real-ip header', () => {
      const mockRequest = {
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'x-forwarded-for') return null;
            if (header === 'x-real-ip') return '10.0.0.1';
            return null;
          }),
        },
      } as any;

      const identifier = getIdentifierFromRequest(mockRequest);
      expect(identifier).toBe('10.0.0.1');
    });

    it('should return anonymous when no IP headers present', () => {
      const mockRequest = {
        headers: {
          get: jest.fn(() => null),
        },
      } as any;

      const identifier = getIdentifierFromRequest(mockRequest);
      expect(identifier).toBe('anonymous');
    });
  });
});
