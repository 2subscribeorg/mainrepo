import { describe, it, expect, beforeEach } from 'vitest'
import { useLoadingStates, useDashboardLoading, type LoadingStateKey } from './useLoadingStates'

describe('useLoadingStates', () => {
  beforeEach(() => {
    // Reset all loading states before each test
    const { resetAllLoading } = useLoadingStates()
    resetAllLoading()
  })

  describe('Basic loading state management', () => {
    it('should set and get loading states correctly', () => {
      const { setLoading, isLoading } = useLoadingStates()
      
      // Initially should be false
      expect(isLoading('dashboard').value).toBe(false)
      
      // Set to true
      setLoading('dashboard', true)
      expect(isLoading('dashboard').value).toBe(true)
      
      // Set back to false
      setLoading('dashboard', false)
      expect(isLoading('dashboard').value).toBe(false)
    })

    it('should track multiple loading states independently', () => {
      const { setLoading, isLoading } = useLoadingStates()
      
      setLoading('dashboard', true)
      setLoading('suggestions', true)
      setLoading('transactions', false)
      
      expect(isLoading('dashboard').value).toBe(true)
      expect(isLoading('suggestions').value).toBe(true)
      expect(isLoading('transactions').value).toBe(false)
    })
  })

  describe('Batch operations', () => {
    it('should set multiple loading states at once', () => {
      const { setBatchLoading, isLoading } = useLoadingStates()
      
      setBatchLoading({
        dashboard: true,
        suggestions: true,
        transactions: false
      })
      
      expect(isLoading('dashboard').value).toBe(true)
      expect(isLoading('suggestions').value).toBe(true)
      expect(isLoading('transactions').value).toBe(false)
    })

    it('should reset all loading states', () => {
      const { setLoading, resetAllLoading, isLoading } = useLoadingStates()
      
      // Set multiple states to true
      setLoading('dashboard', true)
      setLoading('suggestions', true)
      setLoading('transactions', true)
      
      // Reset all
      resetAllLoading()
      
      // All should be false
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
      expect(isLoading('transactions').value).toBe(false)
    })
  })

  describe('Computed properties', () => {
    it('should detect when any loading state is active', () => {
      const { setLoading, isAnyLoading } = useLoadingStates()
      
      expect(isAnyLoading.value).toBe(false)
      
      setLoading('dashboard', true)
      expect(isAnyLoading.value).toBe(true)
      
      setLoading('suggestions', true)
      expect(isAnyLoading.value).toBe(true)
      
      setLoading('dashboard', false)
      expect(isAnyLoading.value).toBe(true) // suggestions still true
      
      setLoading('suggestions', false)
      expect(isAnyLoading.value).toBe(false)
    })

    it('should check if multiple specific states are loading', () => {
      const { setLoading, areLoading } = useLoadingStates()
      
      const dashboardAndSuggestions = areLoading('dashboard', 'suggestions')
      
      expect(dashboardAndSuggestions.value).toBe(false)
      
      setLoading('dashboard', true)
      expect(dashboardAndSuggestions.value).toBe(true)
      
      setLoading('suggestions', true)
      expect(dashboardAndSuggestions.value).toBe(true)
      
      setLoading('dashboard', false)
      expect(dashboardAndSuggestions.value).toBe(true) // suggestions still true
      
      setLoading('suggestions', false)
      expect(dashboardAndSuggestions.value).toBe(false)
    })

    it('should list active loading states', () => {
      const { setLoading, activeLoadingStates } = useLoadingStates()
      
      expect(activeLoadingStates.value).toEqual([])
      
      setLoading('dashboard', true)
      setLoading('suggestions', true)
      
      expect(activeLoadingStates.value).toContain('dashboard')
      expect(activeLoadingStates.value).toContain('suggestions')
      expect(activeLoadingStates.value).toHaveLength(2)
      
      setLoading('dashboard', false)
      expect(activeLoadingStates.value).toEqual(['suggestions'])
    })
  })

  describe('Async helpers', () => {
    it('should manage loading state during async operations', async () => {
      const { withLoading, isLoading } = useLoadingStates()
      
      let resolvePromise: () => void
      const testPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      
      expect(isLoading('dashboard').value).toBe(false)
      
      const asyncOperation = withLoading('dashboard', async () => {
        expect(isLoading('dashboard').value).toBe(true)
        await testPromise
        return 'success'
      })
      
      // Should be loading now
      expect(isLoading('dashboard').value).toBe(true)
      
      // Resolve the promise
      resolvePromise!()
      const result = await asyncOperation
      
      // Should not be loading anymore
      expect(isLoading('dashboard').value).toBe(false)
      expect(result).toBe('success')
    })

    it('should handle async operation errors correctly', async () => {
      const { withLoading, isLoading } = useLoadingStates()
      
      expect(isLoading('dashboard').value).toBe(false)
      
      try {
        await withLoading('dashboard', async () => {
          expect(isLoading('dashboard').value).toBe(true)
          throw new Error('Test error')
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Test error')
      }
      
      // Should not be loading anymore even after error
      expect(isLoading('dashboard').value).toBe(false)
    })

    it('should manage multiple loading states during async operations', async () => {
      const { withBatchLoading, isLoading } = useLoadingStates()
      
      const keys: LoadingStateKey[] = ['dashboard', 'suggestions']
      
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
      
      await withBatchLoading(keys, async () => {
        expect(isLoading('dashboard').value).toBe(true)
        expect(isLoading('suggestions').value).toBe(true)
      })
      
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
    })
  })

  describe('Scoped loaders', () => {
    it('should create scoped loader with predefined keys', () => {
      const { createScopedLoader, isLoading } = useLoadingStates()
      
      const scopedLoader = createScopedLoader(['dashboard', 'suggestions'])
      
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
      expect(scopedLoader.isLoading.value).toBe(false)
      
      scopedLoader.start()
      
      expect(isLoading('dashboard').value).toBe(true)
      expect(isLoading('suggestions').value).toBe(true)
      expect(scopedLoader.isLoading.value).toBe(true)
      
      scopedLoader.stop()
      
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
      expect(scopedLoader.isLoading.value).toBe(false)
    })
  })

  describe('Predefined scoped loaders', () => {
    it('should work with dashboard loading helper', () => {
      const { isLoading } = useLoadingStates()
      const dashboardLoader = useDashboardLoading()
      
      expect(dashboardLoader.isLoading.value).toBe(false)
      
      dashboardLoader.start()
      
      expect(isLoading('dashboard').value).toBe(true)
      expect(isLoading('suggestions').value).toBe(true)
      expect(isLoading('transactions').value).toBe(true)
      expect(dashboardLoader.isLoading.value).toBe(true)
      
      dashboardLoader.stop()
      
      expect(isLoading('dashboard').value).toBe(false)
      expect(isLoading('suggestions').value).toBe(false)
      expect(isLoading('transactions').value).toBe(false)
      expect(dashboardLoader.isLoading.value).toBe(false)
    })
  })

  describe('Global state sharing', () => {
    it('should share state between multiple instances', () => {
      const instance1 = useLoadingStates()
      const instance2 = useLoadingStates()
      
      instance1.setLoading('dashboard', true)
      expect(instance2.isLoading('dashboard').value).toBe(true)
      
      instance2.setLoading('dashboard', false)
      expect(instance1.isLoading('dashboard').value).toBe(false)
    })
  })
})
