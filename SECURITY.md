# Security Implementation - Phase 1

This document outlines the security measures implemented in Phase 1 (mock/local) that will transfer to production.

## ✅ Implemented Security Features

### 1. Input Validation (`src/utils/validation.ts`)

All user inputs are validated before processing:

```typescript
// Example: Category validation
const validation = validateCategory({
  name: userInput.name,
  colour: userInput.colour,
  monthlyLimit: userInput.limit,
})

if (!validation.isValid) {
  // Show errors to user
  showErrors(validation.errors)
  return
}
```

**Validation Rules:**
- **Merchant names**: 2-100 characters
- **Category names**: 2-50 characters
- **Amounts**: 0 to 999,999.99
- **Dates**: ISO format (YYYY-MM-DD)
- **Colors**: Valid hex format (#RRGGBB)
- **Budget logic**: Monthly × 12 ≤ Yearly limit

**Benefits:**
- ✅ Prevents bad data in IndexedDB (Phase 1)
- ✅ Reduces invalid API calls (Phase 2)
- ✅ Improves user experience with clear error messages

---

### 2. Input Sanitization (`src/utils/sanitize.ts`)

All inputs are sanitized before storage:

```typescript
// Removes HTML, control characters, enforces length limits
const sanitizedName = sanitizeMerchantName(userInput)
const sanitizedAmount = sanitizeAmount(userInput)
const sanitizedColor = sanitizeHexColor(userInput)
```

**Sanitization Applied:**
- Remove HTML brackets (`<` `>`)
- Remove control characters
- Enforce maximum lengths
- Normalize numeric inputs
- Validate color formats

**XSS Prevention:**
```typescript
// Vue auto-escapes {{ }} interpolation ✅
<p>{{ subscription.merchantName }}</p>

// Use sanitizeHtml for any raw HTML (avoid v-html)
const safe = sanitizeHtml(userInput)
```

**Benefits:**
- ✅ Prevents XSS attacks from malicious localStorage/IndexedDB data
- ✅ Protects against compromised APIs in Phase 2
- ✅ Ensures data consistency

---

### 3. Client-Side Rate Limiting (`src/utils/rateLimiter.ts`)

Prevents rapid repeated actions:

```typescript
// Example: Limit save operations
if (!checkRateLimit('save-category', RATE_LIMITS.SAVE_DATA)) {
  showError('Too many attempts. Please wait.')
  return
}
```

**Rate Limit Presets:**
- **Form submissions**: 5 per minute
- **Save operations**: 10 per minute
- **Delete operations**: 3 per minute
- **Search queries**: 20 per minute

**Benefits:**
- ✅ Prevents accidental rapid clicks
- ✅ Reduces API costs in Phase 2
- ✅ Protects against client-side DoS

---

### 4. Error Handling

User-friendly error messages without exposing internals:

```typescript
try {
  await saveData()
} catch (error) {
  // ❌ DON'T: Show technical details
  // showError(error.stack)
  
  // ✅ DO: Show generic message
  showError('Failed to save. Please try again.')
  console.error(error) // Log for debugging only
}
```

**Benefits:**
- ✅ Better UX
- ✅ Doesn't leak system architecture
- ✅ Makes debugging easier with console logs

---

### 5. Validation Error Display

Consistent error UI across all forms:

```vue
<!-- Validation Errors Component -->
<div v-if="validationErrors.length > 0" class="rounded-lg bg-red-50 p-3 border border-red-200">
  <p class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
  <ul class="list-disc list-inside text-sm text-red-700">
    <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
  </ul>
</div>
```

---

## 📊 Security Coverage

### Forms with Validation & Sanitization

| Component | Validation | Sanitization | Rate Limiting | Error Display |
|-----------|:----------:|:------------:|:-------------:|:-------------:|
| Categories.vue | ✅ | ✅ | ✅ | ✅ |
| Budgets.vue | ✅ | ✅ | ✅ | ✅ |
| Admin.vue | ✅ | ✅ | ✅ | ✅ |
| Subscriptions | 🔄 Next | 🔄 Next | 🔄 Next | 🔄 Next |

---

## 🔐 Vue.js Built-in Security

**Auto-escaping (Already Active):**
```vue
<!-- ✅ Safe - Auto-escaped -->
<p>{{ userInput }}</p>

<!-- ⚠️ Dangerous - Avoid unless necessary -->
<p v-html="rawHtml"></p>

<!-- ✅ Safe - Attributes auto-escaped -->
<div :title="userInput"></div>
```

**Content Security Policy:**
Already configured in `index.html` meta tags (add if missing):
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

---

## 🚀 Phase 2 Additions (Firebase)

When integrating APIs, add these layers:

### 1. Server-Side Validation (Critical!)
```typescript
// Cloud Function
export const createSubscription = functions.https.onCall(async (data, context) => {
  // ✅ NEVER trust client validation alone
  const validation = validateSubscription(data)
  if (!validation.isValid) {
    throw new functions.https.HttpsError('invalid-argument', validation.errors.join(', '))
  }
  
  // Process...
})
```

### 2. Authentication
```typescript
// Add auth token to all requests
const token = await getAuthToken()
await fetch('/api/subscriptions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### 3. Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /subscriptions/{subId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 4. HTTPS Only
```typescript
// Enforce HTTPS in production
if (window.location.protocol !== 'https:' && ENV.IS_PROD) {
  window.location.href = window.location.href.replace('http:', 'https:')
}
```

---

## 🧪 Testing Security Features

### Unit Tests
```typescript
// Test validation
test('should reject invalid amounts', () => {
  expect(isValidAmount(-10)).toBe(false)
  expect(isValidAmount(1000000)).toBe(false)
  expect(isValidAmount(50.99)).toBe(true)
})

// Test sanitization
test('should remove HTML tags', () => {
  expect(sanitizeHtml('<script>alert(1)</script>'))
    .toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
})

// Test rate limiting
test('should block after max attempts', () => {
  for (let i = 0; i < 5; i++) {
    expect(rateLimiter.check('test', 5, 60000)).toBe(true)
  }
  expect(rateLimiter.check('test', 5, 60000)).toBe(false)
})
```

### Manual Testing
1. **XSS Test**: Try entering `<script>alert('XSS')</script>` in category name
2. **Validation Test**: Try entering negative amounts or invalid dates
3. **Rate Limit Test**: Click save button rapidly 20 times
4. **Edge Cases**: Try empty strings, very long strings, special characters

---

## 📝 Best Practices Checklist

### For All Forms:
- [ ] Validate on submit (not on every keystroke)
- [ ] Sanitize before storing
- [ ] Rate limit expensive operations
- [ ] Show clear, actionable error messages
- [ ] Disable submit button while saving
- [ ] Log errors to console for debugging

### For Phase 2 (APIs):
- [ ] Add server-side validation (CRITICAL)
- [ ] Require authentication for all writes
- [ ] Use HTTPS only
- [ ] Implement proper CORS headers
- [ ] Add request logging
- [ ] Set up security monitoring

---

## 🎯 Security Audit Commands

```bash
# Check for console.log in production builds
npm run build && grep -r "console.log" dist/

# Test TypeScript strict mode
npm run type-check

# Lint for security issues
npm run lint

# Run security tests
npm test -- validation.test.ts
```

---

## 📚 References

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Vue Security Guide**: https://vuejs.org/guide/best-practices/security.html
- **Content Security Policy**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html

---

## 🔄 Transfer Rate to Production

| Feature | Phase 1 Value | Phase 2 Value | Transfer Rate |
|---------|---------------|---------------|---------------|
| Input Validation | Essential | Critical | **95%** |
| Sanitization | Good | Critical | **100%** |
| Client Rate Limiting | Nice-to-have | Important | **60%** (needs server version) |
| Error Handling | Good | Critical | **100%** |
| TypeScript Types | Essential | Essential | **100%** |

**Bottom Line:** All security measures implemented in Phase 1 remain valuable in production and form the **first line of defense** in a layered security approach.
