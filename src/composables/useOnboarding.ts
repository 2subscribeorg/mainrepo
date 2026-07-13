import { ref } from 'vue'
import { logger } from '@/utils/logger'

const ONBOARDING_KEY = '2subscribe_onboarding_complete'

const cachedComplete = ref<boolean | null>(null)

function readFromStorage(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true'
  } catch {
    logger.warn('Failed to read onboarding state from storage')
    return false
  }
}

function writeToStorage(value: boolean): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, String(value))
  } catch {
    logger.warn('Failed to write onboarding state to storage')
  }
}

export function resetOnboardingCache(): void {
  cachedComplete.value = null
}

export function useOnboarding() {
  const onboardingComplete = ref(false)

  async function checkOnboardingStatus(): Promise<boolean> {
    if (cachedComplete.value !== null) {
      onboardingComplete.value = cachedComplete.value
      return cachedComplete.value
    }

    const result = readFromStorage()
    cachedComplete.value = result
    onboardingComplete.value = result
    return result
  }

  async function completeOnboarding(): Promise<void> {
    writeToStorage(true)
    cachedComplete.value = true
    onboardingComplete.value = true
  }

  function resetOnboarding(): void {
    writeToStorage(false)
    cachedComplete.value = false
    onboardingComplete.value = false
  }

  return {
    onboardingComplete,
    checkOnboardingStatus,
    completeOnboarding,
    resetOnboarding,
  }
}
