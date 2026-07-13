import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useOnboarding, resetOnboardingCache } from '@/composables/useOnboarding'

const ONBOARDING_KEY = '2subscribe_onboarding_complete'

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetOnboardingCache()
  })

  it('checkOnboardingStatus returns false when no flag exists', async () => {
    const { checkOnboardingStatus } = useOnboarding()
    const result = await checkOnboardingStatus()
    expect(result).toBe(false)
  })

  it('checkOnboardingStatus returns true when flag is set', async () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    const { checkOnboardingStatus } = useOnboarding()
    const result = await checkOnboardingStatus()
    expect(result).toBe(true)
  })

  it('completeOnboarding sets the flag in localStorage', async () => {
    const { completeOnboarding, checkOnboardingStatus } = useOnboarding()
    await completeOnboarding()
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('true')
    const result = await checkOnboardingStatus()
    expect(result).toBe(true)
  })

  it('resetOnboarding clears the flag', async () => {
    const { completeOnboarding, resetOnboarding, checkOnboardingStatus } = useOnboarding()
    await completeOnboarding()
    resetOnboarding()
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe('false')
    const result = await checkOnboardingStatus()
    expect(result).toBe(false)
  })

  it('uses cached value on subsequent reads', async () => {
    const { checkOnboardingStatus } = useOnboarding()
    await checkOnboardingStatus()
    // Even if localStorage changes externally, cached value should be used
    localStorage.setItem(ONBOARDING_KEY, 'true')
    const result = await checkOnboardingStatus()
    expect(result).toBe(false)
  })
})
