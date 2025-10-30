import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MerchantCategoryRule, ID } from '@/domain/models'
import { repoFactory } from '@/data/repo/RepoFactory'
import { seedDatabase } from '@/data/repo/mock/seedData'
import { clearDB } from '@/data/repo/mock/db'

export const useAdminStore = defineStore('admin', () => {
  const merchantRules = ref<MerchantCategoryRule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const repo = repoFactory.getMerchantRulesRepo()

  async function fetchRules() {
    loading.value = true
    error.value = null
    try {
      merchantRules.value = await repo.list()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch rules'
    } finally {
      loading.value = false
    }
  }

  async function saveRule(rule: MerchantCategoryRule) {
    loading.value = true
    error.value = null
    try {
      await repo.upsert(rule)
      await fetchRules()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save rule'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteRule(id: ID) {
    loading.value = true
    error.value = null
    try {
      await repo.remove(id)
      merchantRules.value = merchantRules.value.filter((r) => r.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete rule'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function resetDatabase() {
    loading.value = true
    error.value = null
    try {
      await clearDB()
      await seedDatabase()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to reset database'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getStats() {
    try {
      const subscriptionsRepo = repoFactory.getSubscriptionsRepo()
      const transactionsRepo = repoFactory.getTransactionsRepo()
      const categoriesRepo = repoFactory.getCategoriesRepo()

      const [subscriptions, transactions, categories, rules] = await Promise.all([
        subscriptionsRepo.list(),
        transactionsRepo.list(),
        categoriesRepo.list(),
        repo.list(),
      ])

      return {
        subscriptions: subscriptions.length,
        transactions: transactions.length,
        categories: categories.length,
        rules: rules.length,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get stats'
      return null
    }
  }

  return {
    merchantRules,
    loading,
    error,
    fetchRules,
    saveRule,
    deleteRule,
    resetDatabase,
    getStats,
  }
})
