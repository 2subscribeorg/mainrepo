import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BudgetConfig, BudgetStatus, Money, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { budgetService } from '@/domain/services/BudgetService'

export const useBudgetStore = defineStore('budget', () => {
  const config = ref<BudgetConfig | null>(null)
  const currentMonthStatus = ref<BudgetStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const repo = repoFactory.getBudgetsRepo()

  const hasBreaches = computed(() => currentMonthStatus.value?.isOverBudget || false)
  const breaches = computed(() => currentMonthStatus.value?.breaches || [])

  async function fetchConfig() {
    loading.value = true
    error.value = null
    try {
      config.value = await repo.get()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch budget config'
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(newConfig: BudgetConfig) {
    loading.value = true
    error.value = null
    try {
      await repo.set(newConfig)
      config.value = newConfig
      await evaluateCurrentMonth()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update budget config'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function evaluateMonth(monthISO: string) {
    loading.value = true
    error.value = null
    try {
      return await budgetService.evaluateMonth(monthISO)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to evaluate budget'
      return null
    } finally {
      loading.value = false
    }
  }

  async function evaluateCurrentMonth() {
    loading.value = true
    error.value = null
    try {
      currentMonthStatus.value = await budgetService.getCurrentMonthStatus()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to evaluate current month'
    } finally {
      loading.value = false
    }
  }

  async function checkWillExceed(amount: Money, categoryId?: ID, date?: string) {
    try {
      return await budgetService.willExceedOnAdd(amount, categoryId, date)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to check budget'
      return { willExceed: false }
    }
  }

  async function getYearlySpending(year: number) {
    loading.value = true
    error.value = null
    try {
      return await budgetService.getYearlySpending(year)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get yearly spending'
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    config,
    currentMonthStatus,
    loading,
    error,
    hasBreaches,
    breaches,
    fetchConfig,
    updateConfig,
    evaluateMonth,
    evaluateCurrentMonth,
    checkWillExceed,
    getYearlySpending,
  }
})
