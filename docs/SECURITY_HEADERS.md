# Security Headers Implementation

## Overview

This application implements comprehensive security headers to protect against XSS, clickjacking, MIME sniffing, and other common web vulnerabilities.

## Implemented Security Headers

### 1. X-Frame-Options: DENY
**Purpose:** Prevent clickjacking attacks
**Value:** `DENY`
**Protection:** Prevents your site from being framed in other sites

```http
X-Frame-Options: DENY
```

### 2. X-Content-Type-Options: nosniff
**Purpose:** Prevent MIME type sniffing
**Value:** `nosniff`
**Protection:** Forces browser to respect declared content type

```http
X-Content-Type-Options: nosniff
```

### 3. X-XSS-Protection: 1; mode=block
**Purpose:** Legacy XSS protection (modern browsers use CSP)
**Value:** `1; mode=block`
**Protection:** Enables browser's built-in XSS filter

```http
X-XSS-Protection: 1; mode=block
```

### 4. Strict-Transport-Security (HSTS)
**Purpose:** Enforce HTTPS connections
**Value:**
- Development: `max-age=0` (disabled)
- Production: `max-age=63072000; includeSubDomains; preload` (2 years)
**Protection:** Prevents man-in-the-middle attacks

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 5. Content-Security-Policy (CSP)
**Purpose:** Restrict sources of content (scripts, styles, images, etc.)
**Value:** Dynamic based on environment
**Protection:** Prevents XSS and data exfiltration

#### CSP Directives

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.openai.com wss://*.supabase.co;
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  manifest-src 'self';
  worker-src 'self' blob:;
  media-src 'self' https://*.supabase.co;
  prefetch-src 'self';
  upgrade-insecure-requests
```

### 6. Referrer-Policy
**Purpose:** Control referrer information sharing
**Value:** `strict-origin-when-cross-origin`
**Protection:** Prevents leaking sensitive URLs

```http
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. Permissions-Policy
**Purpose:** Restrict browser features
**Value:** `camera=(), microphone=(), geolocation=(), payment=()`
**Protection:** Prevents unauthorized access to sensitive features

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 8. Cross-Origin Headers
**Purpose:** Additional cross-origin protection
**Values:**
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
**Protection:** Prevents cross-origin attacks

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 9. X-DNS-Prefetch-Control
**Purpose:** Control DNS prefetching
**Value:** `on`
**Protection:** Controlled DNS prefetching for performance

```http
X-DNS-Prefetch-Control: on
```

## Configuration

### Environment Variables

Security headers adapt based on environment:

```bash
# .env.local (development)
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.production (production)
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Customizing CSP

To add additional allowed sources, modify `lib/security-headers.ts`:

```typescript
const directives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net`,
  // Add your custom sources
  `connect-src 'self' https://your-api.com`,
  // ...
];
```

## Verification

### Test Security Headers Locally

1. Start development server:
```bash
npm run dev
```

2. Check headers with curl:
```bash
curl -I http://localhost:3000

# Expected output:
# HTTP/1.1 200 OK
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'...
# Strict-Transport-Security: max-age=0
# Referrer-Policy: strict-origin-when-cross-origin
# ...
```

3. Check API headers:
```bash
curl -I http://localhost:3000/api/processes

# Should include all security headers
```

### Test with Browser DevTools

1. Open Chrome DevTools
2. Navigate to **Network** tab
3. Reload page
4. Click on main document request
5. Check **Response Headers** section

### Test CSP Violations

Open browser console and look for CSP messages:

```
[Report Only] Refused to load script from 'https://evil.com/script.js'
because it violates the following Content Security Policy directive:
"script-src 'self' ..."
```

## CSP Troubleshooting

### Issue: Resources blocked by CSP

**Symptoms:** Scripts, styles, or images not loading

**Solution:**

1. Check browser console for CSP violation messages
2. Identify blocked resource URL
3. Add appropriate source to CSP in `lib/security-headers.ts`:

```typescript
// Example: Allow analytics script
`script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net https://analytics.example.com`,

// Example: Allow images from CDN
`img-src 'self' data: blob: https://*.supabase.co https://cdn.example.com`,
```

### Issue: Inline scripts blocked

**Symptoms:** Inline event handlers not working (e.g., `onclick="..."`)

**Solution:**

Avoid inline scripts. Use event listeners instead:

```javascript
// BAD (blocked by CSP):
<button onclick="doSomething()">Click</button>

// GOOD (allowed):
document.querySelector('button').addEventListener('click', doSomething);
```

If you must use inline scripts, use nonces or hashes (advanced).

### Issue: eval() blocked

**Symptoms:** Errors using `eval()`, `setTimeout()` with string, etc.

**Solution:**

The CSP allows `'unsafe-eval'` for Next.js compatibility. If you remove this:

1. Avoid using `eval()`
2. Use function references instead of strings in `setTimeout`:
```javascript
// BAD:
setTimeout('doSomething()', 1000);

// GOOD:
setTimeout(doSomething, 1000);
```

## Testing Security Headers

### Automated Testing

Use security header testing tools:

1. **Security Headers Scanner**
   ```bash
   npx securityheaders scan https://your-domain.com
   ```

2. **Mozilla Observatory**
   ```bash
   npx observatory scan https://your-domain.com
   ```

3. **CSP Evaluator**
   - Visit: https://csp-evaluator.withgoogle.com/
   - Enter your CSP
   - Get recommendations

### Manual Testing Checklist

- [ ] `X-Frame-Options: DENY` present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `Strict-Transport-Security` present (production only)
- [ ] `Content-Security-Policy` present and valid
- [ ] `Referrer-Policy` present
- [ ] `Permissions-Policy` present
- [ ] No CSP violations in console
- [ ] All resources loading correctly
- [ ] Forms and navigation working
- [ ] API endpoints responding with headers

## Best Practices

1. **Always use HTTPS** in production (required for HSTS)
2. **Test CSP in development** before production deployment
3. **Monitor CSP violation reports** (set up report-uri if needed)
4. **Keep headers updated** as new threats emerge
5. **Review headers regularly** for necessary adjustments
6. **Use security scanners** to verify implementation
7. **Document any exceptions** to security policies
8. **Educate team** about security implications

## Security Scores

Implementing these headers should improve your security scores:

- **Security Headers Scanner**: A+ grade
- **Mozilla Observatory**: High score (90+)
- **SSL Labs**: A+ grade (with HSTS preload)

## Performance Impact

Security headers have **minimal performance impact**:
- Added to each response (~500 bytes)
- No additional processing time
- Browser enforcement is client-side
- Can improve privacy and security

## Compliance

These headers help with compliance:

- **GDPR:** Enhanced data protection
- **PCI DSS:** Required for payment processing
- **SOC 2:** Security best practices
- **OWASP:** Top 10 protections

## Further Reading

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [CSP Level 3](https://w3c.github.io/webappsec-csp/)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com)

## Support

For issues or questions:
- Check browser console for CSP violations
- Review `lib/security-headers.ts` configuration
- Test in development before production
- Monitor security scanner results
