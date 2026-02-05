// lib/security-headers.ts
import type { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { getSecurityHeaders as getHeaders } from './security-headers-config';

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
 * Get security headers configuration
 */
export function getSecurityHeaders(): SecurityHeadersConfig {
  return getHeaders() as SecurityHeadersConfig;
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
