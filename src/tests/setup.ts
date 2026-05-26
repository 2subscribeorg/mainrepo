import { vi, beforeEach } from 'vitest'
import { config } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import 'fake-indexeddb/auto'

// Global test setup
config.global.stubs = {
  'router-link': true,
  'router-view': true,
}

// Global plugins - use testing pinia for store mocking
config.global.plugins = [createTestingPinia({
  stubActions: false,
  createSpy: vi.fn,
})]

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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
}

// Also set it on global for Node environment tests that might need it
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Reset bootstrap state before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})
