// lib/cors.ts
import type { NextRequest, NextResponse } from 'next/server';

/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * Controls which origins can access your API resources
 */

export interface CORSConfig {
  origin: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  allowedHeaders?: string[];
  methods?: string[];
  maxAge?: number;
  exposedHeaders?: string[];
}

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-Workspace-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
];

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * Allowed origins for CORS
 * Add your production domains here
 */
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://your-production-domain.com',
  'https://*.your-production-domain.com', // Wildcard subdomains
  ...(process.env.NODE_ENV === 'development'
    ? [
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
      ]
    : []),
];

/**
 * API CORS configuration
 */
export const API_CORS_CONFIG: CORSConfig = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
  allowedHeaders: [...DEFAULT_ALLOWED_HEADERS, 'Idempotency-Key'],
  methods: DEFAULT_METHODS,
  maxAge: 86400, // 24 hours
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
};

/**
 * Get CORS headers for a response
 */
export function getCORSHeaders(config: CORSConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // Access-Control-Allow-Origin
  if (typeof config.origin === 'string') {
    headers['Access-Control-Allow-Origin'] = config.origin;
  }
  // Note: For array or function origins, we set it dynamically in middleware

  // Access-Control-Allow-Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Access-Control-Allow-Headers
  headers['Access-Control-Allow-Headers'] =
    config.allowedHeaders?.join(', ') || DEFAULT_ALLOWED_HEADERS.join(', ');

  // Access-Control-Allow-Methods
  headers['Access-Control-Allow-Methods'] =
    config.methods?.join(', ') || DEFAULT_METHODS.join(', ');

  // Access-Control-Max-Age
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }

  // Access-Control-Expose-Headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }

  return headers;
}

/**
 * Check if an origin is allowed based on the config
 */
export function isOriginAllowed(
  origin: string | null,
  allowed: CORSConfig['origin']
): boolean {
  if (!origin) return false;

  if (typeof allowed === 'string') {
    return origin === allowed;
  }

  if (Array.isArray(allowed)) {
    return allowed.some(allowedOrigin => {
      // Support wildcard patterns
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return origin === allowedOrigin;
    });
  }

  if (typeof allowed === 'function') {
    return allowed(origin);
  }

  return false;
}

/**
 * Add CORS headers to a NextResponse
 */
export function addCORSHeaders(
  response: NextResponse,
  config: CORSConfig,
  origin?: string | null
): NextResponse {
  const headers = getCORSHeaders(config);

  // Set Allow-Origin header based on the actual origin
  if (origin && isOriginAllowed(origin, config.origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  } else if (typeof config.origin === 'string') {
    response.headers.set('Access-Control-Allow-Origin', config.origin);
  }

  // Set other CORS headers
  Object.entries(headers).forEach(([key, value]) => {
    if (key !== 'Access-Control-Allow-Origin') {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCORSPreflight(
  request: NextRequest,
  config: CORSConfig
): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');

    if (!origin || !isOriginAllowed(origin, config.origin)) {
      return new NextResponse(null, { status: 403 });
    }

    const headers = getCORSHeaders(config);
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';

    return new NextResponse(null, {
      status: 204,
      headers,
    });
  }

  return null;
}

/**
 * Middleware wrapper to add CORS to API routes
 */
export function withCORS(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  config: CORSConfig = API_CORS_CONFIG
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const origin = req.headers.get('origin');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      if (!origin || !isOriginAllowed(origin, config.origin)) {
        return new NextResponse(null, { status: 403 });
      }

      const headers = getCORSHeaders(config);
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Vary'] = 'Origin';

      return new NextResponse(null, {
        status: 204,
        headers,
      });
    }

    // Handle actual request
    const response = await handler(req);

    // Add CORS headers to response
    if (origin && isOriginAllowed(origin, config.origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');

      const headers = getCORSHeaders(config);
      Object.entries(headers).forEach(([key, value]) => {
        if (key !== 'Access-Control-Allow-Origin') {
          response.headers.set(key, value);
        }
      });
    }

    return response;
  };
}

/**
 * Helper to create a CORS-enabled API route handler
 */
export function createCORSRouteHandler(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  config: CORSConfig = API_CORS_CONFIG
) {
  return withCORS(handler, config);
}
