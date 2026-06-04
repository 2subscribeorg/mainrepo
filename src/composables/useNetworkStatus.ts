import { ref, readonly } from 'vue'
import { Capacitor } from '@capacitor/core'

const isOnline = ref(true)
let initialized = false

async function init() {
  if (initialized) return
  initialized = true

  if (Capacitor.isNativePlatform()) {
    const { Network } = await import('@capacitor/network')
    const status = await Network.getStatus()
    isOnline.value = status.connected

    Network.addListener('networkStatusChange', (status) => {
      isOnline.value = status.connected
    })
  } else {
    isOnline.value = navigator.onLine
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
  }
}

export function useNetworkStatus() {
  return {
    isOnline: readonly(isOnline),
    init,
  }
}
