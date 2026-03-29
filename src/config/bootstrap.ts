/**
 * Application Bootstrap
 * Centralized initialization for Firebase and other app-wide setup
 * This ensures Firebase is initialized exactly once, regardless of how many times it's imported
 */

import { initializeFirebase } from './firebase'
import { logger } from '@/utils/logger'
import { useAuthStore } from '@/stores/auth'

// Track initialization state
let isBootstrapped = false
let bootstrapPromise: Promise<void> | null = null

/**
 * Bootstrap the application
 * Safe to call multiple times - only runs initialization once
 * 
 * @returns Promise that resolves when bootstrap is complete
 */
export async function bootstrapApp(): Promise<void> {
  // If already bootstrapped, return immediately
  if (isBootstrapped) {
    return
  }

  // If bootstrap is in progress, wait for it
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  // Start bootstrap process
  bootstrapPromise = (async () => {
    const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

    if (isFirebaseMode) {
      try {
        // Initialize Firebase
        initializeFirebase()
        logger.success('Firebase initialized')

        // Initialize auth listener
        const authStore = useAuthStore()
        authStore.initAuthListener()
      } catch (error) {
        logger.error('❌ Failed to initialize Firebase:', error)
        throw error
      }
    }

    isBootstrapped = true
  })()

  return bootstrapPromise
}

/**
 * Check if app has been bootstrapped
 */
export function isAppBootstrapped(): boolean {
  return isBootstrapped
}

/**
 * Reset bootstrap state (for testing only)
 * @internal
 */
export function resetBootstrap(): void {
  isBootstrapped = false
}
