import { ref, computed } from 'vue'

export type ConsentState = 'granted' | 'declined' | 'undecided'

const CONSENT_STORAGE_KEY = '2subscribe_consent_v1'

function readStoredConsent(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (raw === 'granted' || raw === 'declined') {
      return raw
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
  return 'undecided'
}

function writeStoredConsent(value: ConsentState) {
  try {
    if (value === 'undecided') {
      localStorage.removeItem(CONSENT_STORAGE_KEY)
    } else {
      localStorage.setItem(CONSENT_STORAGE_KEY, value)
    }
  } catch {
    // silently fail if localStorage is unavailable
  }
}

// Global reactive state shared across all instances
let consentState = ref<ConsentState>(readStoredConsent())

export function useConsent() {
  const granted = computed(() => consentState.value === 'granted')
  const declined = computed(() => consentState.value === 'declined')
  const undecided = computed(() => consentState.value === 'undecided')

  function grant() {
    consentState.value = 'granted'
    writeStoredConsent('granted')
  }

  function decline() {
    consentState.value = 'declined'
    writeStoredConsent('declined')
  }

  function reset() {
    consentState.value = 'undecided'
    writeStoredConsent('undecided')
  }

  return {
    state: consentState,
    granted,
    declined,
    undecided,
    grant,
    decline,
    reset,
  }
}

// Internal function for test isolation - re-reads from localStorage
export function _resetConsentState() {
  consentState = ref<ConsentState>(readStoredConsent())
}
