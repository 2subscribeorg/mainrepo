import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/stores/onboarding'

// Mock firebase firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
}))

vi.mock('@/config/firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-123', email: 'test@example.com' },
  })),
}))

describe('useOnboardingStore', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initial state', () => {
    it('starts with carouselSeen false when localStorage is empty', () => {
      const store = useOnboardingStore()
      expect(store.carouselSeen).toBe(false)
    })

    it('reads carouselSeen from localStorage', () => {
      localStorage.setItem('2sub_welcome_carousel_seen', 'true')
      const store = useOnboardingStore()
      expect(store.carouselSeen).toBe(true)
    })

    it('starts with onboardingCompleted false', () => {
      const store = useOnboardingStore()
      expect(store.onboardingCompleted).toBe(false)
    })

    it('starts at step index 0', () => {
      const store = useOnboardingStore()
      expect(store.currentStepIndex).toBe(0)
    })

    it('starts with default currency GBP', () => {
      const store = useOnboardingStore()
      expect(store.currency).toBe('GBP')
    })

    it('starts with empty displayName', () => {
      const store = useOnboardingStore()
      expect(store.displayName).toBe('')
    })

    it('starts with notificationsEnabled false', () => {
      const store = useOnboardingStore()
      expect(store.notificationsEnabled).toBe(false)
    })

    it('starts with bankConnected false', () => {
      const store = useOnboardingStore()
      expect(store.bankConnected).toBe(false)
    })
  })

  describe('Computed properties', () => {
    it('returns correct currentStep for index 0', () => {
      const store = useOnboardingStore()
      expect(store.currentStep).toBe('welcome')
    })

    it('returns correct currentStep for last index', () => {
      const store = useOnboardingStore()
      store.currentStepIndex = ONBOARDING_STEPS.length - 1
      expect(store.currentStep).toBe('premium')
    })

    it('isLastStep is false on first step', () => {
      const store = useOnboardingStore()
      expect(store.isLastStep).toBe(false)
    })

    it('isLastStep is true on last step', () => {
      const store = useOnboardingStore()
      store.currentStepIndex = ONBOARDING_STEPS.length - 1
      expect(store.isLastStep).toBe(true)
    })

    it('progress is 25% on first step', () => {
      const store = useOnboardingStore()
      expect(store.progress).toBe(25)
    })

    it('progress is 100% on last step', () => {
      const store = useOnboardingStore()
      store.currentStepIndex = ONBOARDING_STEPS.length - 1
      expect(store.progress).toBe(100)
    })
  })

  describe('markCarouselSeen', () => {
    it('sets carouselSeen to true', () => {
      const store = useOnboardingStore()
      store.markCarouselSeen()
      expect(store.carouselSeen).toBe(true)
    })

    it('persists to localStorage', () => {
      const store = useOnboardingStore()
      store.markCarouselSeen()
      expect(localStorage.getItem('2sub_welcome_carousel_seen')).toBe('true')
    })
  })

  describe('nextStep', () => {
    it('increments step index', () => {
      const store = useOnboardingStore()
      store.nextStep()
      expect(store.currentStepIndex).toBe(1)
    })

    it('does not exceed max index', () => {
      const store = useOnboardingStore()
      store.currentStepIndex = ONBOARDING_STEPS.length - 1
      store.nextStep()
      expect(store.currentStepIndex).toBe(ONBOARDING_STEPS.length - 1)
    })
  })

  describe('prevStep', () => {
    it('decrements step index', () => {
      const store = useOnboardingStore()
      store.currentStepIndex = 2
      store.prevStep()
      expect(store.currentStepIndex).toBe(1)
    })

    it('does not go below 0', () => {
      const store = useOnboardingStore()
      store.prevStep()
      expect(store.currentStepIndex).toBe(0)
    })
  })

  describe('goToStep', () => {
    it('jumps to the specified step', () => {
      const store = useOnboardingStore()
      store.goToStep(2)
      expect(store.currentStepIndex).toBe(2)
    })

    it('ignores negative indices', () => {
      const store = useOnboardingStore()
      store.goToStep(-1)
      expect(store.currentStepIndex).toBe(0)
    })

    it('ignores out-of-range indices', () => {
      const store = useOnboardingStore()
      store.goToStep(99)
      expect(store.currentStepIndex).toBe(0)
    })
  })

  describe('reset', () => {
    it('resets all collected data', () => {
      const store = useOnboardingStore()
      store.displayName = 'John'
      store.currency = 'EUR'
      store.notificationsEnabled = true
      store.bankConnected = true
      store.currentStepIndex = 3

      store.reset()

      expect(store.displayName).toBe('')
      expect(store.currency).toBe('GBP')
      expect(store.notificationsEnabled).toBe(false)
      expect(store.bankConnected).toBe(false)
      expect(store.currentStepIndex).toBe(0)
    })
  })

  describe('checkOnboardingStatus (Mock mode)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DATA_BACKEND', 'MOCK')
    })

    it('reads from localStorage in Mock mode', async () => {
      localStorage.setItem('2sub_onboarding_completed', 'true')
      const store = useOnboardingStore()
      await store.checkOnboardingStatus()
      expect(store.onboardingCompleted).toBe(true)
    })

    it('returns false when localStorage is empty in Mock mode', async () => {
      const store = useOnboardingStore()
      await store.checkOnboardingStatus()
      expect(store.onboardingCompleted).toBe(false)
    })
  })

  describe('completeOnboarding (Mock mode)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DATA_BACKEND', 'MOCK')
    })

    it('sets onboardingCompleted to true', async () => {
      const store = useOnboardingStore()
      await store.completeOnboarding()
      expect(store.onboardingCompleted).toBe(true)
    })

    it('persists to localStorage in Mock mode', async () => {
      const store = useOnboardingStore()
      await store.completeOnboarding()
      expect(localStorage.getItem('2sub_onboarding_completed')).toBe('true')
    })

    it('sets loading to false after completion', async () => {
      const store = useOnboardingStore()
      await store.completeOnboarding()
      expect(store.loading).toBe(false)
    })
  })

  describe('ONBOARDING_STEPS constant', () => {
    it('has 4 steps', () => {
      expect(ONBOARDING_STEPS).toHaveLength(4)
    })

    it('has steps in correct order', () => {
      expect(ONBOARDING_STEPS).toEqual(['welcome', 'notifications', 'bank', 'premium'])
    })
  })
})
