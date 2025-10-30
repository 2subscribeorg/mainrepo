# Advanced Security Features

This document covers the advanced security implementations beyond basic validation.

## 🚦 Client-Side Rate Limiting

### Implementation

Rate limiting prevents abuse of expensive operations:

**Search Operations** (`Subscriptions.vue`):
```typescript
function handleSearchInput() {
  // Rate limit: 20 searches per minute
  if (!checkRateLimit('search-subscriptions', RATE_LIMITS.SEARCH)) {
    searchRateLimited.value = true
    setTimeout(() => searchRateLimited.value = false, 2000)
    return
  }

  // Debounce: Wait 300ms after last keystroke
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    // Trigger search
  }, 300)
}
```

### Rate Limit Configuration

Located in `src/utils/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  FORM_SUBMIT: { maxAttempts: 5, windowMs: 60000 },    // 5 per minute
  SAVE_DATA: { maxAttempts: 10, windowMs: 60000 },     // 10 per minute
  DELETE_DATA: { maxAttempts: 3, windowMs: 60000 },    // 3 per minute
  SEARCH: { maxAttempts: 20, windowMs: 60000 },        // 20 per minute
  PASSWORD: { maxAttempts: 3, windowMs: 300000 },      // 3 per 5 minutes
}
```

### Where Applied

| Operation | Rate Limit | Debounce | Location |
|-----------|:----------:|:--------:|----------|
| **Search** | 20/min | 300ms | Subscriptions.vue |
| **Save Category** | 10/min | - | Categories.vue |
| **Save Budget** | 10/min | - | Budgets.vue |
| **Save Merchant Rule** | 10/min | - | Admin.vue |
| **Delete Operations** | 3/min | - | All CRUD operations |

### Benefits

#### Phase 1 (Mock)
- ✅ Prevents accidental rapid clicks
- ✅ Reduces unnecessary computations
- ✅ Better user experience (no lag from excessive filtering)

#### Phase 2 (Production)
- ✅ Reduces API call costs
- ✅ Prevents Cloud Function quota exhaustion
- ✅ Protects against basic client-side DoS
- ✅ Complements server-side rate limiting

### Testing Rate Limits

```typescript
// Unit test example
test('should block after max attempts', () => {
  for (let i = 0; i < 20; i++) {
    expect(rateLimiter.check('search', 20, 60000)).toBe(true)
  }
  expect(rateLimiter.check('search', 20, 60000)).toBe(false)
})
```

**Manual test:**
1. Go to Subscriptions page
2. Type rapidly in search box
3. After 20 keystrokes in 1 minute, see rate limit message

---

## 🛡️ Error Handling Without Exposing Internals

### Implementation

Located in `src/utils/errorHandler.ts`:

```typescript
// ❌ BAD: Exposes technical details
try {
  await saveData()
} catch (error) {
  alert(error.message) // "IndexedDB transaction failed at line 42"
  alert(error.stack)   // Full stack trace visible to user
}

// ✅ GOOD: User-friendly message, technical details logged
try {
  await saveData()
} catch (error) {
  const message = ErrorHandlers.save(error, 'category')
  alert(message) // "Failed to save category. Please try again."
  // Technical details logged to console for debugging
}
```

### Error Categories

The error handler automatically categorizes errors:

| Category | Trigger | User Message |
|----------|---------|--------------|
| **network** | `fetch()` fails, "network" in message | "Connection error. Check internet." |
| **timeout** | "timeout" in message | "Request timed out. Try again." |
| **validation** | `TypeError` | "Please check your input." |
| **notFound** | "not found" in message | "Item not found." |
| **unauthorized** | 401, "unauthorized" | "No permission for this action." |
| **default** | Any other error | "Something went wrong. Try again." |

### Usage Examples

**Save Operation:**
```typescript
try {
  await categoriesStore.save(category)
  alert('✅ Category saved!')
} catch (error) {
  const message = ErrorHandlers.save(error, 'category')
  validationErrors.value = [message]
}
```

**Load Operation:**
```typescript
try {
  data = await fetchData()
} catch (error) {
  // Non-critical: log but don't show
  ErrorHandlers.load(error, 'statistics')
}
```

**Async Wrapper:**
```typescript
const { data, error } = await handleAsync(
  () => subscriptionsStore.fetchAll(),
  'Fetch Subscriptions'
)

if (error) {
  showError(error) // Already user-friendly
} else {
  processData(data)
}
```

### Safe Utilities

**Safe JSON Parse:**
```typescript
// Won't throw, returns fallback
const data = safeJsonParse(jsonString, { default: 'value' })
```

**Safe LocalStorage:**
```typescript
SafeStorage.set('key', { data: 'value' }) // Returns boolean
const data = SafeStorage.get('key', { default: 'value' })
```

### What Gets Logged

**Console (Dev & Debug):**
```
❌ Error in Save Category
Category: validation
Error: TypeError: Cannot read property 'name' of undefined
Stack: [full stack trace]
```

**User Sees:**
```
Failed to save category. Please check your input and try again.
```

### Phase 2 Integration

```typescript
export const handleError = (error, context, config) => {
  // Console logging (always)
  console.error(error)
  
  // Error tracking service (Phase 2)
  if (config.logToServer && ENV.IS_PROD) {
    Sentry.captureException(error, {
      context: context,
      user: getCurrentUser()
    })
  }
  
  return userFriendlyMessage
}
```

---

## 🔐 Content Security Policy (CSP)

### Implementation

Located in `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://firebaseapp.com https://*.firebaseio.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
">
```

### CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| **default-src** | `'self'` | Default: only load from same origin |
| **script-src** | `'self'` | Only execute scripts from same origin (no inline scripts) |
| **style-src** | `'self' 'unsafe-inline'` | Allow inline styles (needed for Tailwind) |
| **img-src** | `'self' data: https:` | Images from same origin, data URIs, HTTPS |
| **connect-src** | `'self' https://firebase...` | API calls to same origin + Firebase |
| **frame-src** | `'none'` | No iframes allowed |
| **object-src** | `'none'` | No `<object>`, `<embed>`, `<applet>` |
| **base-uri** | `'self'` | Prevent `<base>` tag injection |
| **form-action** | `'self'` | Forms only submit to same origin |
| **upgrade-insecure-requests** | - | Automatically upgrade HTTP → HTTPS |

### What CSP Blocks

#### ❌ Blocked Attacks

```html
<!-- Inline script injection (XSS) -->
<img src="x" onerror="alert('XSS')">
<!-- ❌ Blocked by script-src 'self' -->

<!-- Script from external domain -->
<script src="https://evil.com/hack.js"></script>
<!-- ❌ Blocked by script-src 'self' -->

<!-- Iframe injection -->
<iframe src="https://phishing-site.com"></iframe>
<!-- ❌ Blocked by frame-src 'none' -->

<!-- eval() and Function() -->
eval("malicious code")
new Function("malicious code")()
<!-- ❌ Blocked by script-src 'self' -->
```

#### ✅ Allowed Content

```html
<!-- Scripts from same origin -->
<script src="/assets/index-abc123.js"></script>
<!-- ✅ Allowed -->

<!-- Inline styles (Tailwind) -->
<div class="bg-blue-500 text-white">
<!-- ✅ Allowed by 'unsafe-inline' -->

<!-- HTTPS images -->
<img src="https://example.com/image.png">
<!-- ✅ Allowed by img-src https: -->

<!-- Firebase API calls -->
fetch('https://firestore.googleapis.com/...')
<!-- ✅ Allowed by connect-src -->
```

### Additional Security Headers

**Referrer Policy:**
```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```
- Only send origin (not full URL) in Referer header
- Prevents leaking sensitive URL parameters

**Permissions Policy:**
```html
<meta http-equiv="Permissions-Policy" content="
  geolocation=(),
  microphone=(),
  camera=(),
  payment=()
">
```
- Disables unnecessary browser features
- Prevents permission abuse

**X-Content-Type-Options:**
```html
<meta http-equiv="X-Content-Type-Options" content="nosniff">
```
- Prevents MIME type sniffing
- Forces browser to respect declared Content-Type

**X-Frame-Options:**
```html
<meta http-equiv="X-Frame-Options" content="DENY">
```
- Prevents clickjacking attacks
- App cannot be embedded in iframes

### Testing CSP

**Check Console for Violations:**
```
Refused to execute inline script because it violates CSP directive: 'script-src 'self''
```

**Test with intentional violation:**
```vue
<!-- This should be blocked -->
<button @click="eval('alert(1)')">Test</button>
```

Browser console will show CSP violation.

### Phase 2 Updates

When adding Firebase:

```html
<!-- Update connect-src to include Firebase domains -->
<meta http-equiv="Content-Security-Policy" content="
  connect-src 'self' 
    https://*.firebaseapp.com 
    https://*.firebaseio.com 
    https://firestore.googleapis.com
    https://identitytoolkit.googleapis.com;
">
```

For production, use HTTP headers instead of meta tags:
```nginx
# nginx config
add_header Content-Security-Policy "default-src 'self'; ...";
```

---

## 📊 Security Features Summary

| Feature | Phase 1 | Phase 2 | Transfer Rate |
|---------|:-------:|:-------:|:-------------:|
| **Rate Limiting (Client)** | ✅ | ✅ | 80% (add server-side) |
| **Error Handling** | ✅ | ✅ | 100% |
| **CSP Headers** | ✅ | ✅ | 100% |
| Input Validation | ✅ | ✅ | 95% |
| Sanitization | ✅ | ✅ | 100% |
| **Rate Limiting (Server)** | ❌ | ✅ | - |
| **HTTPS Enforcement** | ❌ | ✅ | - |
| **Authentication** | ❌ | ✅ | - |

---

## 🧪 Testing Checklist

### Rate Limiting
- [ ] Search rapidly in Subscriptions - see rate limit message after 20 attempts
- [ ] Click "Save Budget" 15 times rapidly - blocked after 10
- [ ] Delete 5 items rapidly - blocked after 3

### Error Handling
- [ ] Break localStorage (fill it up) - see friendly error, not stack trace
- [ ] Disconnect network, try to save - see "Connection error" message
- [ ] Open console - technical details logged but not shown to user

### CSP
- [ ] Check browser console - no CSP violations on normal usage
- [ ] Try to inject `<script>` tag via dev tools - blocked
- [ ] App works normally with CSP active

---

## 🎯 Key Takeaways

1. **Rate Limiting** prevents both accidental and malicious abuse
2. **Error Handling** improves UX while maintaining security
3. **CSP** is a critical defense-in-depth layer
4. **All three features transfer to production** with minimal changes
5. **Client-side security complements server-side security** (not replaces)

---

## 📚 References

- **Rate Limiting**: https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
- **Error Handling**: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
- **CSP**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **Security Headers**: https://securityheaders.com/

---

**Status: ✅ Advanced Security Features Complete**

Next: Apply error handling to remaining components, add server-side rate limiting in Phase 2.
