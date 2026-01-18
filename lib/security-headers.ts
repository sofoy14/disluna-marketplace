// lib/security-headers.ts
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 * Protects against XSS, clickjacking, MIME sniffing, and other attacks
 */

interface SecurityHeadersConfig {
  'X-DNS-Prefetch-Control': string;
  'Strict-Transport-Security': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Content-Security-Policy': string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
  'Cross-Origin-Embedder-Policy'?: string;
}

/**
 * Build Content Security Policy based on environment
 *
 * CSP directives restrict sources of content (scripts, styles, images, etc.)
 * to prevent XSS attacks and data exfiltration
 */
function buildCSP(): string {
  const isDev = process.env.NODE_ENV === 'development';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
  const openAiUrl = 'https://api.openai.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const directives = [
    // Default: Only allow same-origin
    `default-src 'self'`,

    // Scripts: Self, unsafe-eval for Next.js, unsafe-inline for development
    isDev
      ? `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net`
      : `script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net`,

    // Styles: Self + unsafe-inline (required for CSS-in-JS)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

    // Images: Self, data, blob, Supabase storage
    `img-src 'self' data: blob: ${supabaseUrl.replace(/https:\/\/\*\.?/, 'https://*')}`,

    // Fonts: Self + Google Fonts
    `font-src 'self' https://fonts.gstatic.com`,

    // Connect: API endpoints
    `connect-src 'self' ${supabaseUrl} ${openAiUrl} wss://*.supabase.co`,

    // Frame: None (prevent clickjacking)
    `frame-src 'none'`,
    `frame-ancestors 'none'`,

    // Object: None (prevent plugins)
    `object-src 'none'`,

    // Base: Self
    `base-uri 'self'`,

    // Form actions: Self only
    `form-action 'self'`,

    // Manifest: Self
    `manifest-src 'self'`,

    // Upgrade insecure requests in production
    ...(isDev ? [] : ['upgrade-insecure-requests']),

    // Worker sources
    `worker-src 'self' blob:`,

    // Media: Self + Supabase
    `media-src 'self' ${supabaseUrl.replace(/https:\/\/\*\.?/, 'https://*')}`,

    // Prefetch: Self
    `prefetch-src 'self'`,
  ];

  return directives.join('; ');
}

/**
 * Get security headers configuration
 */
export function getSecurityHeaders(): SecurityHeadersConfig {
  const isDev = process.env.NODE_ENV === 'development';

  return {
    // Control DNS prefetching
    'X-DNS-Prefetch-Control': 'on',

    // HSTS: Enforce HTTPS for 2 years (include subdomains, preload)
    // Only in production, as localhost doesn't use HTTPS
    'Strict-Transport-Security': isDev
      ? 'max-age=0'
      : 'max-age=63072000; includeSubDomains; preload',

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS protection (legacy, modern browsers use CSP)
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy (formerly Feature-Policy)
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=()',

    // Content Security Policy
    'Content-Security-Policy': buildCSP(),

    // Additional security headers for modern browsers
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}

/**
 * Apply security headers to a NextResponse
 */
export function addSecurityHeaders(
  response: NextResponse
): NextResponse {
  const headers = getSecurityHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Apply security headers to a Response
 */
export function addSecurityHeadersToResponse(
  response: Response
): Response {
  const headers = getSecurityHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Create a NextResponse with security headers
 */
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit
): NextResponse {
  const response = new NextResponse(body, init);
  return addSecurityHeaders(response);
}

/**
 * Create a secure JSON response
 */
export function secureJson(data: any, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init);
  return addSecurityHeaders(response);
}

/**
 * Create a secure redirect response
 */
export function secureRedirect(url: string, status = 307): NextResponse {
  const response = NextResponse.redirect(url, status);
  return addSecurityHeaders(response);
}

/**
 * Middleware wrapper to add security headers to all responses
 */
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}
