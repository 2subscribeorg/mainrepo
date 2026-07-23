import { vi, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'

// Global test setup
config.global.stubs = {
  'router-link': true,
  'router-view': true,
}

// Polyfill localStorage for jsdom environments where it's missing
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
      get length() { return Object.keys(store).length },
    },
    writable: true,
  })
}

// Mock Firebase config to prevent initialization in tests
vi.mock('@/config/firebase', () => ({
  initializeFirebase: vi.fn(),
  getFirebaseAuth: vi.fn(),
  getFirebaseDb: vi.fn(),
}))

// Mock bootstrap to prevent auto-initialization
vi.mock('@/config/bootstrap', () => ({
  bootstrapApp: vi.fn().mockResolvedValue(undefined),
  isAppBootstrapped: vi.fn().mockReturnValue(true),
  resetBootstrap: vi.fn(),
}))

// Reset bootstrap state before each test
beforeEach(() => {
  vi.clearAllMocks()
})
