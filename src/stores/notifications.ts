import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NotificationData } from '@/domain/models'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<NotificationData[]>([])

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  function addNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    }
    notifications.value.unshift(newNotification)

    // Auto-dismiss after 10 seconds for budget breaches
    if (notification.type === 'budget_breach') {
      setTimeout(() => {
        markAsRead(newNotification.id)
      }, 10000)
    }
  }

  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id)
    if (notification) {
      notification.read = true
    }
  }

  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.read = true
    })
  }

  function clear() {
    notifications.value = []
  }

  function clearRead() {
    notifications.value = notifications.value.filter((n) => !n.read)
  }

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clear,
    clearRead,
  }
})
