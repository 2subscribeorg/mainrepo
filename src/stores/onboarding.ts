import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { getFirebaseDb } from '@/config/firebase'
import { useAuthStore } from '@/stores/auth'

const CAROUSEL_SEEN_KEY = '2sub_welcome_carousel_seen'

export type OnboardingStep = 'welcome' | 'notifications' | 'bank' | 'premium'

export const ONBOARDING_STEPS: OnboardingStep[] = ['welcome', 'notifications', 'bank', 'premium']

export const useOnboardingStore = defineStore('onboarding', () => {
  const carouselSeen = ref(localStorage.getItem(CAROUSEL_SEEN_KEY) === 'true')
  const onboardingCompleted = ref(false)
  const currentStepIndex = ref(0)
  const loading = ref(false)

  // Data collected during onboarding
  const displayName = ref('')
  const currency = ref('GBP')
  const notificationsEnabled = ref(false)
  const bankConnected = ref(false)

  const currentStep = computed<OnboardingStep>(() => ONBOARDING_STEPS[currentStepIndex.value])
  const isLastStep = computed(() => currentStepIndex.value === ONBOARDING_STEPS.length - 1)
  const progress = computed(() => Math.round(((currentStepIndex.value + 1) / ONBOARDING_STEPS.length) * 100))

  function markCarouselSeen() {
    carouselSeen.value = true
    localStorage.setItem(CAROUSEL_SEEN_KEY, 'true')
  }

  function nextStep() {
    if (currentStepIndex.value < ONBOARDING_STEPS.length - 1) {
      currentStepIndex.value++
    }
  }

  function prevStep() {
    if (currentStepIndex.value > 0) {
      currentStepIndex.value--
    }
  }

  function goToStep(index: number) {
    if (index >= 0 && index < ONBOARDING_STEPS.length) {
      currentStepIndex.value = index
    }
  }

  async function checkOnboardingStatus(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) return

    const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
    if (!isFirebaseMode) {
      onboardingCompleted.value = localStorage.getItem('2sub_onboarding_completed') === 'true'
      return
    }

    try {
      const db = getFirebaseDb()
      const userRef = doc(db, 'users', authStore.user.id)
      const snap = await getDoc(userRef)
      if (snap.exists()) {
        const data = snap.data()
        onboardingCompleted.value = data.onboardingCompleted === true
        if (data.displayName) displayName.value = data.displayName
        if (data.preferences?.currency) currency.value = data.preferences.currency
      }
    } catch {
      // Best-effort — don't block onboarding if Firestore is unreachable
    }
  }

  async function completeOnboarding(): Promise<void> {
    const authStore = useAuthStore()
    loading.value = true

    const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

    try {
      if (isFirebaseMode && authStore.user) {
        const db = getFirebaseDb()
        const userRef = doc(db, 'users', authStore.user.id)
        await setDoc(userRef, {
          onboardingCompleted: true,
          displayName: displayName.value || null,
          preferences: {
            currency: currency.value,
            notifications: notificationsEnabled.value,
          },
        }, { merge: true })
      } else {
        localStorage.setItem('2sub_onboarding_completed', 'true')
      }

      onboardingCompleted.value = true
    } catch {
      // Fallback to localStorage so user isn't stuck
      localStorage.setItem('2sub_onboarding_completed', 'true')
      onboardingCompleted.value = true
    } finally {
      loading.value = false
    }
  }

  function reset() {
    currentStepIndex.value = 0
    displayName.value = ''
    currency.value = 'GBP'
    notificationsEnabled.value = false
    bankConnected.value = false
  }

  return {
    carouselSeen,
    onboardingCompleted,
    currentStepIndex,
    currentStep,
    isLastStep,
    progress,
    loading,
    displayName,
    currency,
    notificationsEnabled,
    bankConnected,
    markCarouselSeen,
    nextStep,
    prevStep,
    goToStep,
    checkOnboardingStatus,
    completeOnboarding,
    reset,
  }
})
