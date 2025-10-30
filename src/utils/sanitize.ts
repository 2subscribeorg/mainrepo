/**
 * XSS Prevention & Input Sanitization
 * Protects against malicious input in Phase 1 and Phase 2
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Converts HTML to plain text by escaping special characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''
  
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

/**
 * Sanitize merchant name
 * - Trims whitespace
 * - Removes potentially dangerous characters
 * - Limits length
 */
export function sanitizeMerchantName(name: string): string {
  return name
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .substring(0, 100) // Max length
}

/**
 * Sanitize category name
 */
export function sanitizeCategoryName(name: string): string {
  return name
    .trim()
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .substring(0, 50)
}

/**
 * Sanitize merchant pattern for admin rules
 */
export function sanitizeMerchantPattern(pattern: string): string {
  return pattern
    .trim()
    .toLowerCase()
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .substring(0, 50)
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 100)
}

/**
 * Sanitize numeric input
 * Ensures it's a valid number and within bounds
 */
export function sanitizeAmount(input: number | string): number {
  const num = typeof input === 'string' ? parseFloat(input) : input
  
  if (isNaN(num)) return 0
  if (num < 0) return 0
  if (num > 999999.99) return 999999.99
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100
}

/**
 * Sanitize hex color
 * Ensures valid hex format or returns default
 */
export function sanitizeHexColor(color: string, defaultColor = '#9E9E9E'): string {
  const cleaned = color.trim().toUpperCase()
  
  if (/^#[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned
  }
  
  return defaultColor
}

/**
 * Sanitize ID (UUID format)
 * Returns null if invalid
 */
export function sanitizeId(id: string): string | null {
  const trimmed = id.trim()
  
  // Basic UUID format check
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed
  }
  
  return null
}

/**
 * Deep sanitize an object
 * Recursively sanitizes all string values in an object
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'string') {
    return sanitizeHtml(obj) as T
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize) as T
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = deepSanitize(value)
    }
    return sanitized as T
  }
  
  return obj
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim().toLowerCase()
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return null
  }
  
  // Only allow http/https
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null
  }
  
  return url.trim()
}
