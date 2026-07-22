import { describe, it, expect, beforeEach } from 'vitest'
import { useConsent, _resetConsentState } from './useConsent'

const CONSENT_STORAGE_KEY = '2subscribe_consent_v1'

describe('useConsent', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
    } catch {
      // localStorage may be unavailable in some test environments
    }
    // Reset the global state to re-read from localStorage
    _resetConsentState()
  })

  describe('Initial state', () => {
    it('should start with undecided state when no stored value', () => {
      const { state, undecided, granted, declined } = useConsent()

      expect(state.value).toBe('undecided')
      expect(undecided.value).toBe(true)
      expect(granted.value).toBe(false)
      expect(declined.value).toBe(false)
    })

    it('should restore granted state from localStorage', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'granted')
      _resetConsentState()

      const { state, granted } = useConsent()

      expect(state.value).toBe('granted')
      expect(granted.value).toBe(true)
    })

    it('should restore declined state from localStorage', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'declined')
      _resetConsentState()

      const { state, declined } = useConsent()

      expect(state.value).toBe('declined')
      expect(declined.value).toBe(true)
    })

    it('should treat invalid stored values as undecided', () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'invalid')

      const { state, undecided } = useConsent()

      expect(state.value).toBe('undecided')
      expect(undecided.value).toBe(true)
    })
  })

  describe('Grant consent', () => {
    it('should set state to granted when grant is called', () => {
      const { grant, state, granted } = useConsent()

      grant()

      expect(state.value).toBe('granted')
      expect(granted.value).toBe(true)
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    })

    it('should persist granted state to localStorage', () => {
      const { grant } = useConsent()

      grant()

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    })

    it('should transition from undecided to granted', () => {
      const { grant, state, undecided, granted } = useConsent()

      expect(undecided.value).toBe(true)

      grant()

      expect(state.value).toBe('granted')
      expect(undecided.value).toBe(false)
      expect(granted.value).toBe(true)
    })

    it('should transition from declined to granted', () => {
      const { decline, grant, state, declined, granted } = useConsent()

      decline()
      expect(state.value).toBe('declined')
      expect(declined.value).toBe(true)

      grant()

      expect(state.value).toBe('granted')
      expect(declined.value).toBe(false)
      expect(granted.value).toBe(true)
    })
  })

  describe('Decline consent', () => {
    it('should set state to declined when decline is called', () => {
      const { decline, state, declined } = useConsent()

      decline()

      expect(state.value).toBe('declined')
      expect(declined.value).toBe(true)
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('declined')
    })

    it('should persist declined state to localStorage', () => {
      const { decline } = useConsent()

      decline()

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('declined')
    })

    it('should transition from undecided to declined', () => {
      const { decline, state, undecided, declined } = useConsent()

      expect(undecided.value).toBe(true)

      decline()

      expect(state.value).toBe('declined')
      expect(undecided.value).toBe(false)
      expect(declined.value).toBe(true)
    })

    it('should transition from granted to declined', () => {
      const { grant, decline, state, granted, declined } = useConsent()

      grant()
      expect(state.value).toBe('granted')
      expect(granted.value).toBe(true)

      decline()

      expect(state.value).toBe('declined')
      expect(granted.value).toBe(false)
      expect(declined.value).toBe(true)
    })
  })

  describe('Reset consent', () => {
    it('should set state to undecided when reset is called', () => {
      const { grant, reset, state, undecided } = useConsent()

      grant()
      expect(state.value).toBe('granted')

      reset()

      expect(state.value).toBe('undecided')
      expect(undecided.value).toBe(true)
    })

    it('should remove consent from localStorage when reset is called', () => {
      const { grant, reset } = useConsent()

      grant()
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')

      reset()

      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    })

    it('should reset from declined state', () => {
      const { decline, reset, state, undecided, declined } = useConsent()

      decline()
      expect(state.value).toBe('declined')

      reset()

      expect(state.value).toBe('undecided')
      expect(undecided.value).toBe(true)
      expect(declined.value).toBe(false)
    })
  })

  describe('Global state sharing', () => {
    it('should share state between multiple instances', () => {
      const instance1 = useConsent()
      const instance2 = useConsent()

      instance1.grant()

      expect(instance2.state.value).toBe('granted')
      expect(instance2.granted.value).toBe(true)
    })

    it('should sync state changes across instances', () => {
      const instance1 = useConsent()
      const instance2 = useConsent()

      instance1.grant()
      expect(instance2.state.value).toBe('granted')

      instance2.decline()
      expect(instance1.state.value).toBe('declined')

      instance1.reset()
      expect(instance2.state.value).toBe('undecided')
    })
  })

  describe('Computed properties', () => {
    it('granted should be true only when state is granted', () => {
      const { state, granted } = useConsent()

      expect(granted.value).toBe(false)

      state.value = 'granted'
      expect(granted.value).toBe(true)

      state.value = 'declined'
      expect(granted.value).toBe(false)

      state.value = 'undecided'
      expect(granted.value).toBe(false)
    })

    it('declined should be true only when state is declined', () => {
      const { state, declined } = useConsent()

      expect(declined.value).toBe(false)

      state.value = 'declined'
      expect(declined.value).toBe(true)

      state.value = 'granted'
      expect(declined.value).toBe(false)

      state.value = 'undecided'
      expect(declined.value).toBe(false)
    })

    it('undecided should be true only when state is undecided', () => {
      const { state, undecided } = useConsent()

      expect(undecided.value).toBe(true)

      state.value = 'granted'
      expect(undecided.value).toBe(false)

      state.value = 'declined'
      expect(undecided.value).toBe(false)

      state.value = 'undecided'
      expect(undecided.value).toBe(true)
    })
  })

  describe('LocalStorage unavailability', () => {
    it('should handle localStorage unavailability gracefully', () => {
      const originalSetItem = localStorage.setItem
      const originalGetItem = localStorage.getItem
      const originalRemoveItem = localStorage.removeItem

      localStorage.setItem = () => { throw new Error('localStorage unavailable') }
      localStorage.getItem = () => null
      localStorage.removeItem = () => { throw new Error('localStorage unavailable') }

      const { grant, state } = useConsent()

      expect(() => grant()).not.toThrow()
      expect(state.value).toBe('granted')

      localStorage.setItem = originalSetItem
      localStorage.getItem = originalGetItem
      localStorage.removeItem = originalRemoveItem
    })
  })
})
