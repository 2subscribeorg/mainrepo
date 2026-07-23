import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { requireOnboarding, redirectIfAuthenticated } from '@/composables/useAuthGuard'
import { useOnboardingStore } from '@/stores/onboarding'
import { getDoc } from 'firebase/firestore'

// Mock firebase
vi.mock('@/config/firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseAuth: vi.fn(() => ({
    currentUser: { emailVerified: true, uid: 'test-uid' },
  })),
}))

// Mock auth flow config
vi.mock('@/config/authFlow', () => ({
  isEmailVerificationRequired: vi.fn(() => false),
}))

// Mock useAuth
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: { value: true },
  }),
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-uid', email: 'test@test.com', emailVerified: true },
    waitForInitialAuthCheck: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock firebase firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
}))

const mockedGetDoc = vi.mocked(getDoc)

function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn()
}

function createMockTo() {
  return { path: '/', fullPath: '/', query: {} } as any
}

function createMockFrom() {
  return { path: '/login', fullPath: '/login', query: {} } as any
}

describe('useAuthGuard — onboarding guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('requireOnboarding', () => {
    it('redirects to /onboarding when not completed (Firebase mode)', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = false

      const next = createMockNext()
      await requireOnboarding(createMockTo(), createMockFrom(), next)

      expect(next).toHaveBeenCalledWith('/onboarding')
    })

    it('calls next() when onboarding is completed (Firebase mode)', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = true

      const next = createMockNext()
      await requireOnboarding(createMockTo(), createMockFrom(), next)

      expect(next).toHaveBeenCalledWith()
    })

    it('skips enforcement in Mock mode', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'MOCK')
      const next = createMockNext()
      await requireOnboarding(createMockTo(), createMockFrom(), next)

      expect(next).toHaveBeenCalledWith()
    })

    it('checks Firestore status when not yet loaded', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = false

      mockedGetDoc.mockClear()
      const next = createMockNext()
      await requireOnboarding(createMockTo(), createMockFrom(), next)

      expect(mockedGetDoc).toHaveBeenCalled()
    })

    it('does not check Firestore when already completed', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = true

      mockedGetDoc.mockClear()
      const next = createMockNext()
      await requireOnboarding(createMockTo(), createMockFrom(), next)

      expect(mockedGetDoc).not.toHaveBeenCalled()
    })
  })

  describe('redirectIfAuthenticated — onboarding integration', () => {
    it('redirects to /onboarding when authenticated but onboarding not completed', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = false

      const next = createMockNext()
      await redirectIfAuthenticated(createMockTo(), createMockFrom(), next)

      expect(next).toHaveBeenCalledWith('/onboarding')
    })

    it('redirects to / when authenticated and onboarding completed', async () => {
      vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
      const store = useOnboardingStore()
      store.onboardingCompleted = true

      const next = createMockNext()
      await redirectIfAuthenticated(createMockTo(), createMockFrom(), next)

      expect(next).toHaveBeenCalledWith('/')
    })
  })
})
