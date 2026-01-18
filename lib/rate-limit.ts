// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting configuration for critical endpoints
 * Prevents brute force attacks, DoS, and API quota exhaustion
 */

// Create Redis instance from environment variables
const getRedisClient = () => {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }

  // Fallback: return null if not configured (rate limiting disabled)
  // This prevents the app from crashing in development
  return null;
};

const redis = getRedisClient();

/**
 * Rate limiter for authentication endpoints
 * Limits: 10 requests per minute per IP/user
 * Prevents: Brute force attacks on login/signup
 */
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
      ephemeralCache: new Map(), // Fallback cache
    })
  : null;

/**
 * Rate limiter for chat endpoints
 * Limits: 60 requests per minute per user
 * Prevents: API quota exhaustion, spam
 */
export const chatRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:chat',
      ephemeralCache: new Map(),
    })
  : null;

/**
 * Rate limiter for document ingestion/upload
 * Limits: 5 uploads per minute per user
 * Prevents: Storage exhaustion, processing abuse
 */
export const ingestRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:ingest',
      ephemeralCache: new Map(),
    })
  : null;

/**
 * Rate limiter for API routes in general
 * Limits: 100 requests per minute per IP
 * Prevents: General API abuse
 */
export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
      ephemeralCache: new Map(),
    })
  : null;

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param rateLimiter - The rate limiter instance to use
 * @returns Object with success status and rate limit info
 */
export async function checkRateLimit(
  identifier: string,
  rateLimiter: Ratelimit | null
): Promise<{
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
}> {
  // If rate limiting is not configured, allow all requests
  if (!rateLimiter) {
    return { success: true };
  }

  try {
    const result = await rateLimiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // On error, allow the request but log the issue
    console.error('Rate limit check failed:', error);
    return { success: true };
  }
}

/**
 * Extract identifier from request
 * Uses IP address, falling back to user ID if available
 */
export function getIdentifierFromRequest(request: Request): string {
  // In a real scenario, you'd get this from headers or user context
  // For now, return a placeholder
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'anonymous';
  return ip;
}

/**
 * Format rate limit headers for response
 */
export function formatRateLimitHeaders(rateLimitInfo: {
  limit?: number;
  remaining?: number;
  reset?: number;
}): HeadersInit {
  const headers: Record<string, string> = {};

  if (rateLimitInfo.limit !== undefined) {
    headers['X-RateLimit-Limit'] = rateLimitInfo.limit.toString();
  }

  if (rateLimitInfo.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = rateLimitInfo.remaining.toString();
  }

  if (rateLimitInfo.reset !== undefined) {
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset.toString();
    headers['Retry-After'] = Math.ceil(
      (rateLimitInfo.reset - Date.now()) / 1000
    ).toString();
  }

  return headers;
}
