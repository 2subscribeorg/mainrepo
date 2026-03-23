import { ref, computed, type Ref } from 'vue'

/**
 * Unified loading state management composable
 * Consolidates all loading states across the application for better coordination
 */

export type LoadingStateKey = 
  | 'dashboard'
  | 'transactions' 
  | 'suggestions'
  | 'bankAccounts'
  | 'categories'
  | 'subscriptions'
  | 'patternDetection'
  | 'bankSync'
  | 'categoryModal'
  | 'reconnection'
  | 'auth'
  | 'admin'
  | 'plaidLink'
  | 'feedback'
  | 'renewalWarnings'

type LoadingStates = {
  [K in LoadingStateKey]: boolean
}

// Global loading state - shared across all instances
const globalLoadingStates = ref<LoadingStates>({
  dashboard: false,
  transactions: false,
  suggestions: false,
  bankAccounts: false,
  categories: false,
  subscriptions: false,
  patternDetection: false,
  bankSync: false,
  categoryModal: false,
  reconnection: false,
  auth: false,
  admin: false,
  plaidLink: false,
  feedback: false,
  renewalWarnings: false
})

export function useLoadingStates() {
  /**
   * Set loading state for a specific key
   */
  function setLoading(key: LoadingStateKey, loading: boolean) {
    globalLoadingStates.value[key] = loading
  }

  /**
   * Get loading state for a specific key
   */
  function isLoading(key: LoadingStateKey): Ref<boolean> {
    return computed(() => globalLoadingStates.value[key])
  }

  /**
   * Check if any loading state is active
   */
  const isAnyLoading = computed(() => 
    Object.values(globalLoadingStates.value).some(loading => loading)
  )

  /**
   * Check if multiple specific states are loading
   */
  function areLoading(...keys: LoadingStateKey[]): Ref<boolean> {
    return computed(() => 
      keys.some(key => globalLoadingStates.value[key])
    )
  }

  /**
   * Get all currently loading states
   */
  const activeLoadingStates = computed(() => 
    Object.entries(globalLoadingStates.value)
      .filter(([_, loading]) => loading)
      .map(([key, _]) => key as LoadingStateKey)
  )

  /**
   * Batch set multiple loading states
   */
  function setBatchLoading(states: Partial<LoadingStates>) {
    Object.entries(states).forEach(([key, loading]) => {
      if (loading !== undefined) {
        globalLoadingStates.value[key as LoadingStateKey] = loading
      }
    })
  }

  /**
   * Reset all loading states to false
   */
  function resetAllLoading() {
    Object.keys(globalLoadingStates.value).forEach(key => {
      globalLoadingStates.value[key as LoadingStateKey] = false
    })
  }

  /**
   * Create a scoped loading helper for a specific component
   */
  function createScopedLoader(defaultKeys: LoadingStateKey[]) {
    return {
      start: () => setBatchLoading(
        Object.fromEntries(defaultKeys.map(key => [key, true]))
      ),
      stop: () => setBatchLoading(
        Object.fromEntries(defaultKeys.map(key => [key, false]))
      ),
      isLoading: areLoading(...defaultKeys)
    }
  }

  /**
   * Async wrapper that automatically manages loading state
   */
  async function withLoading<T>(
    key: LoadingStateKey, 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    setLoading(key, true)
    try {
      return await asyncFn()
    } finally {
      setLoading(key, false)
    }
  }

  /**
   * Async wrapper for multiple loading states
   */
  async function withBatchLoading<T>(
    keys: LoadingStateKey[], 
    asyncFn: () => Promise<T>
  ): Promise<T> {
    setBatchLoading(Object.fromEntries(keys.map(key => [key, true])))
    try {
      return await asyncFn()
    } finally {
      setBatchLoading(Object.fromEntries(keys.map(key => [key, false])))
    }
  }

  return {
    // State getters
    isLoading,
    isAnyLoading,
    areLoading,
    activeLoadingStates,
    
    // State setters
    setLoading,
    setBatchLoading,
    resetAllLoading,
    
    // Utilities
    createScopedLoader,
    withLoading,
    withBatchLoading,
    
    // Direct access to states (for debugging)
    states: globalLoadingStates
  }
}

/**
 * Predefined scoped loaders for common component patterns
 */
export function useDashboardLoading() {
  const { createScopedLoader } = useLoadingStates()
  return createScopedLoader(['dashboard', 'suggestions', 'transactions'])
}

export function useTransactionLoading() {
  const { createScopedLoader } = useLoadingStates()
  return createScopedLoader(['transactions', 'patternDetection'])
}

export function useBankAccountLoading() {
  const { createScopedLoader } = useLoadingStates()
  return createScopedLoader(['bankAccounts', 'bankSync', 'plaidLink'])
}

export function useCategoryLoading() {
  const { createScopedLoader } = useLoadingStates()
  return createScopedLoader(['categories', 'categoryModal'])
}

export function useAdminLoading() {
  const { createScopedLoader } = useLoadingStates()
  return createScopedLoader(['admin', 'categories'])
}
