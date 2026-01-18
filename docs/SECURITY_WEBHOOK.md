# Wompi Webhook Security

## Overview

This application implements secure webhook processing for Wompi payment events with HMAC-SHA256 signature validation to prevent fraudulent payment attempts.

## Security Implementation

### Signature Validation

**CRITICAL:** Webhook signature validation is **ALWAYS** required in all environments (development, staging, production).

The implementation uses HMAC-SHA256 with timing-safe comparison:

```typescript
// src/integrations/wompi/webhook.ts
export function verifyWompiWebhookSignature(params: {
  payload: string
  signature: string
  secret: string
}): boolean {
  const expectedHex = crypto
    .createHmac("sha256", params.secret)
    .update(params.payload)
    .digest("hex")

  // Timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedHex, "hex")
  )
}
```

### Removed Security Bypass

The `WOMPI_SKIP_SIGNATURE_VALIDATION` environment variable has been **removed** from the codebase. This flag previously allowed webhooks to bypass signature validation, creating a critical security vulnerability.

**Before (INSECURE):**
```typescript
const skipValidation = process.env.WOMPI_SKIP_SIGNATURE_VALIDATION === 'true';
if (!isDev && !skipValidation) {
  // validate signature
}
```

**After (SECURE):**
```typescript
// SECURITY: Webhook signature validation is ALWAYS required
if (!process.env.WOMPI_WEBHOOK_SECRET) {
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
}

const isValid = verifyWompiWebhookSignature({
  payload: body,
  signature,
  secret: process.env.WOMPI_WEBHOOK_SECRET
});

if (!isValid) {
  // Log security event
  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
}
```

## Configuration

### Required Environment Variables

```bash
# Wompi Webhook Configuration (REQUIRED)
WOMPI_WEBHOOK_SECRET=wp_prod_xxx_your_secret_here
```

**WARNING:** Never commit webhook secrets to version control. Always use environment variables or secret management systems.

### Obtaining Your Webhook Secret

1. Log in to your [Wompi Dashboard](https://dashboard.wompi.co/)
2. Navigate to **Integraciones** → **Webhooks**
3. Copy your webhook secret (begins with `wp_prod_` or `wp_test_`)
4. Add it to your environment variables

### Testing Webhook Signature Validation

Generate a valid signature for testing:

```typescript
import crypto from 'crypto';

const payload = JSON.stringify({
  event: 'transaction.updated',
  data: { transaction: { id: 'test', status: 'APPROVED' } }
});

const signature = crypto
  .createHmac('sha256', process.env.WOMPI_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

console.log('Signature:', signature);
```

## Security Monitoring

### Failed Signature Validation

All failed signature validation attempts are logged with:

```typescript
console.error('❌ Invalid webhook signature:', {
  signaturePresent: !!signature,
  signatureLength: signature?.length,
  bodyLength: body.length,
  ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
  timestamp: new Date().toISOString(),
  userAgent: req.headers.get('user-agent'),
});
```

**Recommended:** Set up alerts for repeated signature validation failures.

### Monitoring Strategies

1. **Log Aggregation:** Send webhook logs to a centralized logging system (e.g., Sentry, Datadog)
2. **Alerting:** Configure alerts for multiple failed signature validations from the same IP
3. **Dashboard:** Create a dashboard showing webhook processing metrics
4. **Audit Logs:** Regularly review webhook event logs for suspicious patterns

## Webhook Headers

Wompi may send signatures in different header names. This implementation accepts:

- `x-event-checksum` (primary)
- `X-Event-Checksum`
- `x-wompi-signature`
- `wompi-signature`

The implementation checks all these headers in order.

## Testing

### Run Webhook Security Tests

```bash
npm test webhook-validation
```

All tests must pass before deploying:

- ✅ Reject webhooks without signatures
- ✅ Reject webhooks with invalid signatures
- ✅ Accept webhooks with valid HMAC-SHA256 signatures
- ✅ Reject when webhook secret is not configured
- ✅ Accept signatures from different header names
- ✅ Generate consistent signatures
- ✅ Log security events on failure

### Manual Testing with cURL

**Test without signature (should fail):**
```bash
curl -X POST http://localhost:3000/api/wompi/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"transaction.updated","data":{"transaction":{"id":"test"}}}'
# Expected: 401 Unauthorized
```

**Test with invalid signature (should fail):**
```bash
curl -X POST http://localhost:3000/api/wompi/webhook \
  -H "Content-Type: application/json" \
  -H "x-event-checksum: invalid_signature" \
  -d '{"event":"transaction.updated","data":{"transaction":{"id":"test"}}}'
# Expected: 401 Unauthorized
```

**Test with valid signature (using Node.js):**
```bash
# Create test-webhook.js
const crypto = require('crypto');
const payload = JSON.stringify({
  event: 'transaction.updated',
  data: { transaction: { id: 'test', status: 'APPROVED' } }
});
const signature = crypto
  .createHmac('sha256', process.env.WOMPI_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');

console.log('Payload:', payload);
console.log('Signature:', signature);

# Run it and use the output with curl
curl -X POST http://localhost:3000/api/wompi/webhook \
  -H "Content-Type: application/json" \
  -H "x-event-checksum: $SIGNATURE" \
  -d "$PAYLOAD"
# Expected: 200 OK (or other error depending on payload)
```

## Production Checklist

Before deploying to production:

- [ ] `WOMPI_WEBHOOK_SECRET` is set in production environment
- [ ] Secret is obtained from Wompi dashboard (production mode)
- [ ] Webhook URL is configured in Wompi dashboard
- [ ] All webhook security tests pass
- [ ] Logging and monitoring are configured
- [ ] Alerts are set up for failed signature validations
- [ ] Idempotency is working (prevents duplicate processing)
- [ ] HTTPS is enforced (Wompi requires HTTPS webhooks)

## Common Issues

### Issue: "Invalid webhook signature" errors

**Possible causes:**
1. Wrong `WOMPI_WEBHOOK_SECRET` (check test vs production secret)
2. Payload encoding mismatch (ensure raw body, not parsed)
3. Header name mismatch (Wompi may change header names)

**Solution:**
```typescript
// Log the received signature and expected signature for debugging
console.log('Received:', signature.substring(0, 20));
console.log('Expected:', computeWompiWebhookSignature({ payload: body, secret }));
```

### Issue: "Missing webhook signature" errors

**Possible causes:**
1. Wompi not configured to send signatures
2. Reverse proxy stripping headers
3. Case sensitivity in header names

**Solution:**
- Check Wompi webhook configuration
- Verify reverse proxy preserves headers
- Check all header name variations

### Issue: Development vs Production Secrets

Wompi provides different secrets for test and production modes:

- Test mode: `wp_test_...`
- Production mode: `wp_prod_...`

**Solution:** Use different environment files:
```bash
# .env.local (development)
WOMPI_WEBHOOK_SECRET=wp_test_xxx

# .env.production (production)
WOMPI_WEBHOOK_SECRET=wp_prod_xxx
```

## Best Practices

1. **Never skip signature validation** - even in development
2. **Rotate secrets periodically** - every 90 days recommended
3. **Use separate secrets** for test and production
4. **Monitor failed attempts** - set up alerts
5. **Log security events** - timestamp, IP, user agent
6. **Test in staging** - before production deployment
7. **Use HTTPS only** - required by Wompi
8. **Implement idempotency** - prevent duplicate processing
9. **Rate limit webhooks** - prevent DoS attacks
10. **Verify in production** - after deployment, test with real Wompi webhooks

## Security Considerations

### Timing Attacks

The implementation uses `crypto.timingSafeEqual()` to prevent timing attacks that could allow an attacker to gradually guess the correct signature.

### Replay Attacks

Idempotency keys prevent replay attacks:

```typescript
const idempotencyKey = getWompiIdempotencyKey(event);
const existing = await getWompiWebhookEventByKey(supabase, idempotencyKey);
if (existing?.status === 'processed') {
  return NextResponse.json({ success: true, idempotent: true });
}
```

### Man-in-the-Middle Attacks

HTTPS prevents MITM attacks. Always:
- Use HTTPS in production
- Validate SSL certificates
- Never expose webhook secrets

## Further Reading

- [Wompi Webhooks Documentation](https://docs.wompi.co/es/docs/webhooks/introduction)
- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Web_Security_Cheat_Sheet.html)
- [HMAC Signature Validation](https://en.wikipedia.org/wiki/HMAC)
- [Timing Attacks](https://codahale.com/a-lesson-in-timing-attacks/)

## Support

For issues or questions:
- Check application logs: `console.error('❌ Invalid webhook signature:')`
- Run tests: `npm test webhook-validation`
- Review Wompi dashboard webhook logs
- Contact support with timestamp and IP of failed attempts
