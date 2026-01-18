# CORS Configuration

## Overview

This application implements proper CORS (Cross-Origin Resource Sharing) configuration to control which origins can access API resources, preventing unauthorized cross-origin requests.

## What is CORS?

CORS is a security mechanism that:
- Restricts which domains can access your API
- Prevents malicious websites from making requests on behalf of users
- Protects against CSRF (Cross-Site Request Forgery) attacks
- Controls which headers and methods are allowed

## Configuration

### Allowed Origins

Edit `lib/cors.ts` to configure allowed origins:

```typescript
export const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://your-production-domain.com',
  'https://*.your-production-domain.com', // Wildcard subdomains
  // Add more origins as needed
];
```

### CORS Configuration Options

The default configuration in `lib/cors.ts`:

```typescript
export const API_CORS_CONFIG: CORSConfig = {
  origin: ALLOWED_ORIGINS,           // Allowed origins
  credentials: true,                  // Allow cookies/auth headers
  allowedHeaders: [                   // Permitted request headers
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Workspace-ID',
    'Idempotency-Key',
  ],
  methods: [                          // Allowed HTTP methods
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],
  maxAge: 86400,                      // Preflight cache duration (24 hours)
  exposedHeaders: [                   // Exposed response headers
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
};
```

## How CORS Works

### Simple Requests

For simple requests (GET, POST with simple headers):

1. Browser sends request with `Origin` header
2. Server checks if origin is allowed
3. Server responds with `Access-Control-Allow-Origin` header
4. Browser allows or blocks response based on header

### Preflight Requests (OPTIONS)

For complex requests (custom headers, methods other than GET/POST):

1. Browser sends OPTIONS request first
2. Server responds with allowed methods, headers, origin
3. Browser checks if actual request is permitted
4. If allowed, browser sends actual request

## Implementation

### Middleware CORS Handling

The middleware automatically handles CORS for all `/api/*` routes:

```typescript
// middleware.ts
if (pathname.startsWith('/api/')) {
  const origin = request.headers.get('origin');

  // Handle preflight
  const preflightResponse = handleCORSPreflight(request, API_CORS_CONFIG);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Handle actual request
  const response = NextResponse.next();
  return addCORSHeaders(response, API_CORS_CONFIG, origin);
}
```

### Per-Route CORS

For specific routes, you can use the `withCORS` wrapper:

```typescript
// app/api/custom/route.ts
import { withCORS, API_CORS_CONFIG } from '@/lib/cors';

export const GET = withCORS(async (req) => {
  return NextResponse.json({ data: 'custom' });
}, API_CORS_CONFIG);
```

## Testing CORS

### Test with cURL

**Preflight request (allowed origin):**
```bash
curl -X OPTIONS http://localhost:3000/api/processes \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected response:
# HTTP/1.1 204 No Content
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
# Access-Control-Max-Age: 86400
```

**Preflight request (blocked origin):**
```bash
curl -X OPTIONS http://localhost:3000/api/processes \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected response:
# HTTP/1.1 403 Forbidden
```

**Actual request (allowed origin):**
```bash
curl -X GET http://localhost:3000/api/processes \
  -H "Origin: http://localhost:3000" \
  -v

# Expected response:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
# (response body)
```

### Test with Browser DevTools

1. Open browser console on your site
2. Make a cross-origin request:
```javascript
fetch('http://localhost:3000/api/processes', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

3. Check Network tab for CORS headers

## Common CORS Issues

### Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Origin not in allowed list

**Solution:**
```typescript
// Add the origin to ALLOWED_ORIGINS in lib/cors.ts
export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://your-new-domain.com', // Add this
];
```

### Issue: "CORS policy: Credentials flag is true, but Access-Control-Allow-Origin is '*'"

**Cause:** Cannot use wildcard origin with credentials

**Solution:**
Always specify exact origins when `credentials: true`:
```typescript
// BAD
origin: '*', credentials: true

// GOOD
origin: ['http://localhost:3000'], credentials: true
```

### Issue: "CORS policy: Request header field X-Custom-Header is not allowed"

**Cause:** Header not in `allowedHeaders`

**Solution:**
```typescript
allowedHeaders: [
  'Content-Type',
  'X-Custom-Header', // Add this
],
```

### Issue: "CORS policy: Method PUT is not allowed"

**Cause:** Method not in `methods` list

**Solution:**
```typescript
methods: [
  'GET',
  'POST',
  'PUT', // Add this
  'DELETE',
],
```

## Environment-Specific Configuration

### Development
```typescript
// .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000

// lib/cors.ts automatically includes:
// - http://localhost:3000
// - http://localhost:3001
// - http://127.0.0.1:3000
```

### Production
```typescript
// .env.production
NEXT_PUBLIC_APP_URL=https://your-domain.com

// Update ALLOWED_ORIGINS:
export const ALLOWED_ORIGINS = [
  'https://your-domain.com',
  'https://*.your-domain.com', // All subdomains
  // Add your frontend domains
];
```

## Best Practices

1. **Be specific with origins**
   ```typescript
   // GOOD: Specific origins
   origin: ['https://app.example.com']

   // BAD: Too permissive
   origin: '*'
   ```

2. **Use credentials carefully**
   ```typescript
   // Only enable credentials if you need cookies/auth
   credentials: true // Requires specific origins
   ```

3. **Limit exposed headers**
   ```typescript
   // Only expose necessary headers
   exposedHeaders: [
     'X-RateLimit-Remaining',
     'Retry-After',
   ]
   ```

4. **Set reasonable max-age**
   ```typescript
   // Cache preflight for 24 hours
   maxAge: 86400 // 24 hours
   // Don't set too high (e.g., 1 year) to allow policy updates
   ```

5. **Monitor CORS violations**
   - Check server logs for blocked origins
   - Set up alerts for repeated blocked requests
   - Review regularly for new legitimate origins

## Security Considerations

### Risks of Misconfigured CORS

1. **Data theft:** Malicious sites can read user data
2. **CSRF attacks:** Unauthorized actions on user's behalf
3. **Session hijacking:** Stealing authentication cookies

### Security Checklist

- [ ] Never use `origin: '*'` with `credentials: true`
- [ ] Always validate origins against whitelist
- [ ] Use HTTPS in production
- [ ] Limit allowed headers to necessary ones
- [ ] Limit allowed methods to what you need
- [ ] Monitor for suspicious origin patterns
- [ ] Review allowed origins regularly
- [ ] Test with both allowed and blocked origins

## Troubleshooting

### Verify CORS Headers

```bash
# Check response headers
curl -I http://localhost:3000/api/processes \
  -H "Origin: http://localhost:3000"

# Look for:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
```

### Enable CORS Debug Logging

```typescript
// Add to lib/cors.ts for debugging
export function isOriginAllowed(origin: string | null, allowed: CORSConfig['origin']): boolean {
  console.log('CORS: Checking origin:', origin);
  console.log('CORS: Allowed origins:', allowed);
  const result = /* ... existing logic ... */;
  console.log('CORS: Allowed:', result);
  return result;
}
```

### Test with Different Origins

```bash
# Test with allowed origin
curl -H "Origin: http://localhost:3000" http://localhost:3000/api/processes

# Test with blocked origin
curl -H "Origin: http://evil.com" http://localhost:3000/api/processes

# Test without origin header
curl http://localhost:3000/api/processes
```

## Migration Guide

### Adding a New Domain

1. Update `lib/cors.ts`:
```typescript
export const ALLOWED_ORIGINS = [
  'https://existing-domain.com',
  'https://new-domain.com', // Add new domain
];
```

2. Test preflight:
```bash
curl -X OPTIONS https://your-api.com/api/processes \
  -H "Origin: https://new-domain.com" \
  -H "Access-Control-Request-Method: POST"
```

3. Deploy and verify

### Removing a Domain

1. Remove from `ALLOWED_ORIGINS`
2. Deploy changes
3. Monitor for legitimate requests being blocked
4. Contact domain owner if needed

## Further Reading

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [W3C CORS Specification](https://www.w3.org/TR/cors/)

## Support

For CORS issues:
1. Check browser console for specific error
2. Verify origin in `ALLOWED_ORIGINS`
3. Test with cURL to isolate browser behavior
4. Review server logs for blocked requests
5. Check for conflicts with other middleware
