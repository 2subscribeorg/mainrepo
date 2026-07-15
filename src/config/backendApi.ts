import { Capacitor } from '@capacitor/core'

const DEFAULT_BACKEND_API_URL = 'http://localhost:3002/api'

function normalizeBackendApiBaseUrl(value?: string): string {
  let normalized = (value ?? DEFAULT_BACKEND_API_URL).trim().replace(/\/+$/, '')

  // Android emulator cannot reach host machine via localhost; use 10.0.2.2.
  if (Capacitor.getPlatform() === 'android') {
    try {
      const url = new URL(normalized)
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = '10.0.2.2'
        normalized = url.toString().replace(/\/+$/, '')
      }
    } catch {
      // Keep original value if URL parsing fails.
    }
  }

  if (/\/api$/i.test(normalized)) {
    return normalized
  }

  return `${normalized}/api`
}

export const BACKEND_API_BASE_URL = normalizeBackendApiBaseUrl(import.meta.env.VITE_BACKEND_API_URL)

export function buildBackendApiUrl(path = ''): string {
  if (!path) {
    return BACKEND_API_BASE_URL
  }

  return `${BACKEND_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
