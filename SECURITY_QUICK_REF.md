# 🔐 Security Quick Reference

Quick copy-paste patterns for secure coding.

---

## ✅ Form Validation Pattern

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { validateCategory, type CategoryInput } from '@/utils/validation'
import { sanitizeCategoryName, sanitizeAmount } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import { ErrorHandlers } from '@/utils/errorHandler'

const saving = ref(false)
const validationErrors = ref<string[]>([])
const formData = ref({ name: '', amount: 0 })

async function handleSubmit() {
  validationErrors.value = []
  
  // 1. Rate limiting
  if (!checkRateLimit('save-item', RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage('save-item', RATE_LIMITS.SAVE_DATA)]
    return
  }
  
  // 2. Sanitize
  const sanitizedName = sanitizeCategoryName(formData.value.name)
  const sanitizedAmount = sanitizeAmount(formData.value.amount)
  
  // 3. Validate
  const input: CategoryInput = {
    name: sanitizedName,
    amount: sanitizedAmount,
  }
  
  const validation = validateCategory(input)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }
  
  // 4. Save
  saving.value = true
  try {
    await store.save({ name: sanitizedName, amount: sanitizedAmount })
    // Success!
  } catch (error) {
    validationErrors.value = [ErrorHandlers.save(error, 'category')]
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Error Display -->
  <div v-if="validationErrors.length > 0" class="rounded-lg bg-red-50 p-3 border border-red-200">
    <p class="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
    <ul class="list-disc list-inside text-sm text-red-700">
      <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
    </ul>
  </div>
  
  <button @click="handleSubmit" :disabled="saving">
    {{ saving ? 'Saving...' : 'Save' }}
  </button>
</template>
```

---

## 🔍 Search with Rate Limiting

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { checkRateLimit, RATE_LIMITS } from '@/utils/rateLimiter'
import { sanitizeSearchQuery } from '@/utils/sanitize'

const searchQuery = ref('')
const searchRateLimited = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleSearchInput() {
  // Rate limit
  if (!checkRateLimit('search', RATE_LIMITS.SEARCH)) {
    searchRateLimited.value = true
    setTimeout(() => searchRateLimited.value = false, 2000)
    return
  }
  
  // Debounce
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const sanitized = sanitizeSearchQuery(searchQuery.value)
    // Perform search with sanitized query
  }, 300)
}
</script>

<template>
  <input 
    v-model="searchQuery" 
    @input="handleSearchInput"
    type="text"
    placeholder="Search..."
  />
  <p v-if="searchRateLimited" class="text-sm text-red-600">
    ⚠️ Search rate limited. Please wait.
  </p>
</template>
```

---

## 🛡️ Error Handling Pattern

```typescript
// Simple try-catch
try {
  await someOperation()
} catch (error) {
  const message = ErrorHandlers.save(error, 'item')
  alert(message) // User-friendly message
  // Technical details automatically logged to console
}

// Async wrapper
const { data, error } = await handleAsync(
  () => store.fetchData(),
  'Fetch Data'
)

if (error) {
  showError(error) // Already user-friendly
} else {
  processData(data)
}

// Safe operations
const settings = SafeStorage.get('settings', { theme: 'light' })
SafeStorage.set('settings', newSettings)

const config = safeJsonParse(jsonString, { default: 'config' })
```

---

## 📋 Validation Utilities

```typescript
// Single field validation
if (!isValidEmail(email)) {
  errors.push('Invalid email')
}

if (!isValidAmount(amount)) {
  errors.push('Amount must be 0-999,999.99')
}

if (!isValidISODate(date)) {
  errors.push('Invalid date format')
}

if (!isValidHexColor(color)) {
  errors.push('Invalid color format')
}

// Full object validation
const validation = validateBudget({
  monthlyLimit: 1000,
  yearlyLimit: 12000
})

if (!validation.isValid) {
  showErrors(validation.errors)
}
```

---

## 🧹 Sanitization Utilities

```typescript
// Text sanitization
const safeName = sanitizeMerchantName(userInput)  // Remove HTML, trim, limit length
const safeCategory = sanitizeCategoryName(userInput)
const safeSearch = sanitizeSearchQuery(userInput)

// HTML sanitization
const safeHtml = sanitizeHtml(userInput)  // Escape HTML entities

// Number sanitization
const safeAmount = sanitizeAmount(input)  // Clamp to 0-999,999.99, round to 2 decimals

// Color sanitization
const safeColor = sanitizeHexColor(input)  // Validate or return default
const safeColor = sanitizeHexColor(input, '#FF0000')  // Custom default

// URL sanitization
const safeUrl = sanitizeUrl(url)  // Block javascript:, data:, etc. Returns null if invalid
```

---

## ⏱️ Rate Limiting

```typescript
// Check rate limit
if (!checkRateLimit('action-key', RATE_LIMITS.SAVE_DATA)) {
  const message = getRateLimitMessage('action-key', RATE_LIMITS.SAVE_DATA)
  showError(message)
  return
}

// Custom rate limit
if (!rateLimiter.check('custom-action', 5, 60000)) { // 5 per minute
  showError('Too many attempts')
  return
}

// Get remaining attempts
const remaining = rateLimiter.getRemaining('action-key', 10, 60000)
console.log(`${remaining} attempts remaining`)

// Reset rate limit
rateLimiter.reset('action-key')

// Available presets
RATE_LIMITS.FORM_SUBMIT   // 5 per minute
RATE_LIMITS.SAVE_DATA     // 10 per minute
RATE_LIMITS.DELETE_DATA   // 3 per minute
RATE_LIMITS.SEARCH        // 20 per minute
RATE_LIMITS.PASSWORD      // 3 per 5 minutes
```

---

## 🔒 CSP Configuration

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://your-api.com;
  frame-src 'none';
  object-src 'none';
">
```

---

## 📊 Complete Save Flow

```typescript
async function saveItem() {
  validationErrors.value = []
  
  // 1️⃣ Rate Limit Check
  if (!checkRateLimit('save-item', RATE_LIMITS.SAVE_DATA)) {
    validationErrors.value = [getRateLimitMessage('save-item')]
    return // ❌ STOP
  }
  
  // 2️⃣ Sanitize All Inputs
  const clean = {
    name: sanitizeMerchantName(form.name),
    amount: sanitizeAmount(form.amount),
    color: sanitizeHexColor(form.color),
  }
  
  // 3️⃣ Validate
  const validation = validateItem(clean)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return // ❌ STOP
  }
  
  // 4️⃣ Try Save
  saving.value = true
  try {
    await store.save(clean)
    onSuccess() // ✅ SUCCESS
  } catch (error) {
    validationErrors.value = [ErrorHandlers.save(error, 'item')]
    // ❌ STOP
  } finally {
    saving.value = false
  }
}
```

---

## 🎨 Error Display Component

```vue
<!-- ErrorDisplay.vue -->
<template>
  <div v-if="errors.length > 0" class="rounded-lg bg-red-50 p-3 border border-red-200">
    <p class="text-sm font-medium text-red-800 mb-1">
      {{ title || 'Please fix the following errors:' }}
    </p>
    <ul class="list-disc list-inside text-sm text-red-700">
      <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  errors: string[]
  title?: string
}>()
</script>

<!-- Usage -->
<ErrorDisplay :errors="validationErrors" />
```

---

## 🧪 Testing Patterns

```typescript
// Test validation
test('should reject invalid input', () => {
  const result = validateCategory({ name: 'X' }) // Too short
  expect(result.isValid).toBe(false)
  expect(result.errors).toContain('Category name must be between 2 and 50 characters')
})

// Test sanitization
test('should remove HTML', () => {
  const result = sanitizeHtml('<script>alert(1)</script>')
  expect(result).not.toContain('<script>')
})

// Test rate limiting
test('should block after max attempts', () => {
  for (let i = 0; i < 10; i++) {
    expect(rateLimiter.check('test', 10, 60000)).toBe(true)
  }
  expect(rateLimiter.check('test', 10, 60000)).toBe(false)
})
```

---

## 📦 Import Checklist

```typescript
// For form validation
import { validateX, type XInput } from '@/utils/validation'
import { sanitizeX } from '@/utils/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitMessage } from '@/utils/rateLimiter'
import { ErrorHandlers } from '@/utils/errorHandler'

// For error handling only
import { ErrorHandlers, handleError } from '@/utils/errorHandler'

// For safe operations
import { SafeStorage, safeJsonParse } from '@/utils/errorHandler'
```

---

## ⚡ Quick Tips

### DO ✅
- Validate on submit, not on every keystroke
- Sanitize before storing
- Rate limit expensive operations
- Show user-friendly errors
- Log technical details to console
- Disable buttons while saving
- Use TypeScript strict mode

### DON'T ❌
- Show stack traces to users
- Trust client validation alone (add server-side in Phase 2)
- Use `eval()` or `new Function()`
- Allow inline scripts in CSP
- Expose API keys in client code
- Skip error handling
- Ignore rate limits in production

---

## 🔗 Documentation Links

- **Full Guide**: [SECURITY.md](./SECURITY.md)
- **Implementation Summary**: [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md)
- **Advanced Features**: [SECURITY_ADVANCED.md](./SECURITY_ADVANCED.md)
- **Complete Status**: [SECURITY_COMPLETE.md](./SECURITY_COMPLETE.md)

---

**Keep this file handy for quick reference!** 📋✨
