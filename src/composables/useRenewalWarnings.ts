import { ref, computed, onMounted } from 'vue'
import type { Ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { renewalWarningService } from '@/services/RenewalWarningService'
import type { RenewalWarning } from '@/types/renewalWarning'
import type { ID } from '@/domain/models'
import { bootstrapApp } from '@/config/bootstrap'

export function useRenewalWarnings() {
  const { user, userId } = useAuth()
  
  const warnings: Ref<RenewalWarning[]> = ref([])
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)
  const calculating = ref(false)

  const activeWarnings = computed(() => 
    warnings.value.filter(w => w.status === 'active')
  )

  const criticalWarnings = computed(() =>
    activeWarnings.value.filter(w => w.daysUntilDue <= 1)
  )

  const warningCount = computed(() => activeWarnings.value.length)

  const hasCriticalWarnings = computed(() => criticalWarnings.value.length > 0)

  async function fetchWarnings() {
    if (!userId.value) {
      error.value = 'User not authenticated'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Add small delay to ensure auth is ready
      await new Promise(resolve => setTimeout(resolve, 200))
      warnings.value = await renewalWarningService.getWarnings(userId.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch warnings'
      console.error('Error fetching warnings:', e)
    } finally {
      loading.value = false
    }
  }

  async function calculateWarnings() {
    if (!userId.value) {
      error.value = 'User not authenticated'
      return
    }

    calculating.value = true
    error.value = null

    try {
      await renewalWarningService.calculateWarnings(userId.value)
      await fetchWarnings()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to calculate warnings'
      console.error('Error calculating warnings:', e)
    } finally {
      calculating.value = false
    }
  }

  async function dismissWarning(warningId: ID) {
    if (!userId.value) {
      error.value = 'User not authenticated'
      return
    }

    try {
      await renewalWarningService.dismissWarning(userId.value, warningId)
      
      // Optimistically update UI
      warnings.value = warnings.value.map(w =>
        w.id === warningId ? { ...w, status: 'dismissed' as const } : w
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to dismiss warning'
      console.error('Error dismissing warning:', e)
      
      // Revert on error
      await fetchWarnings()
    }
  }

  function getWarningById(warningId: ID): RenewalWarning | undefined {
    return warnings.value.find(w => w.id === warningId)
  }

  onMounted(async () => {
    if (userId.value) {
      // Wait for Firebase auth to be fully ready
      await bootstrapApp()
      fetchWarnings()
    }
  })

  return {
    warnings,
    activeWarnings,
    criticalWarnings,
    warningCount,
    hasCriticalWarnings,
    loading,
    error,
    calculating,
    fetchWarnings,
    calculateWarnings,
    dismissWarning,
    getWarningById,
  }
}
