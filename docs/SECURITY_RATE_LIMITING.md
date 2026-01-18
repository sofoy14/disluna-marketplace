# Rate Limiting Implementation

## Overview

This application implements rate limiting to protect against brute force attacks, DoS attempts, and API quota exhaustion using Upstash Redis.

## Setup

### 1. Create an Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Select a region close to your application server
4. Copy the REST API URL and token

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

For production:

```bash
# .env.production
UPSTASH_REDIS_REST_URL=https://your-prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_prod_redis_token_here
```

### 3. Install Dependencies

Dependencies are already installed in this project:

```bash
npm install @upstash/ratelimit @upstash/redis
```

## Rate Limits

The following rate limits are configured:

### Authentication Endpoints (`/api/auth/*`)
- **Limit:** 10 requests per minute
- **Identifier:** IP address
- **Purpose:** Prevent brute force attacks on login/signup

### Chat Endpoints (`/api/processes/*/chat`)
- **Limit:** 60 requests per minute
- **Identifier:** User ID
- **Purpose:** Prevent API quota exhaustion and spam

### Document Ingestion (`/api/processes/*/ingest`, `/api/processes/*/documents`)
- **Limit:** 5 uploads per minute
- **Identifier:** User ID
- **Purpose:** Prevent storage exhaustion and processing abuse

### General API Routes (`/api/*`)
- **Limit:** 100 requests per minute
- **Identifier:** IP address
- **Purpose:** General API abuse prevention

## Implementation Details

### Middleware Rate Limiting

The middleware automatically applies rate limiting to all API routes:

```typescript
// middleware.ts
if (pathname.startsWith('/api/')) {
  const identifier = getIdentifierFromRequest(request);
  const rateLimitResult = await checkRateLimit(identifier, rateLimiter);

  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: formatRateLimitHeaders(rateLimitResult) }
    );
  }
}
```

### Endpoint-Specific Rate Limiting

Critical endpoints have explicit rate limiting checks:

```typescript
// app/api/auth/password-signin/route.ts
const identifier = getIdentifierFromRequest(req);
const rateLimitResult = await checkRateLimit(identifier, authRateLimit);

if (!rateLimitResult.success) {
  return NextResponse.json(
    { error: 'Too many login attempts. Please try again later.' },
    { status: 429, headers: formatRateLimitHeaders(rateLimitResult) }
  );
}
```

## Response Headers

Rate-limited responses include the following headers:

- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `X-RateLimit-Reset`: Unix timestamp when the limit resets
- `Retry-After`: Seconds until the client can retry

Example:

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705567200
Retry-After: 45
Content-Type: application/json

{
  "error": "Too many requests. Please try again later.",
  "retryAfter": "45"
}
```

## Development Mode

In development mode, if Upstash Redis is not configured, rate limiting will be disabled and all requests will be allowed. This is intentional to prevent development issues.

**Warning:** Always configure Upstash Redis in production environments.

## Testing

Run the rate limiting tests:

```bash
npm test rate-limit
```

Or run all tests:

```bash
npm test
```

### Manual Testing

Test rate limiting manually with curl:

```bash
# Test auth endpoint rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/auth/password-signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
  echo "Request $i"
done

# Expected: First 10 requests succeed, next 5 return 429
```

## Monitoring

Upstash provides analytics for rate limiting:

1. Go to your Upstash Console
2. Select your Redis database
3. Check the "Metrics" tab
4. Monitor request patterns and blocked requests

## Troubleshooting

### Rate Limiting Not Working

1. Verify environment variables are set:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. Check that Upstash Redis is accessible:
   ```bash
   curl $UPSTASH_REDIS_REST_URL/ping
   ```

3. Check application logs for errors:
   ```bash
   npm run dev
   # Look for: "Rate limit check failed:"
   ```

### All Requests Being Blocked

1. Verify Redis connection is working
2. Check Redis keys: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Ensure token has correct permissions
4. Check Upstash dashboard for Redis status

### Rate Limits Too Strict

Adjust limits in `lib/rate-limit.ts`:

```typescript
export const authRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'), // Increased to 20/min
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;
```

## Best Practices

1. **Always use rate limiting** in production for public APIs
2. **Set appropriate limits** based on your use case
3. **Monitor rate limit violations** to detect abuse patterns
4. **Include user ID** in rate limit identifiers when possible
5. **Log rate limit violations** for security auditing
6. **Test rate limits** in staging before production

## Security Considerations

- Rate limiting prevents brute force attacks but doesn't eliminate them
- Combine rate limiting with other security measures (CSP, CORS, input validation)
- Monitor for distributed attacks from multiple IPs
- Consider CAPTCHA for sensitive operations after rate limit exceeded
- Implement account lockout after repeated violations

## Further Reading

- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [Upstash Rate Limiting Documentation](https://upstash.com/docs/ratelimit/overview)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
