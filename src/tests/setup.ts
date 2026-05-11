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

// Reset bootstrap state before each test
beforeEach(() => {
  vi.clearAllMocks()
})
