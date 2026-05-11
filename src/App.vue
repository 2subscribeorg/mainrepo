<template>
  <ErrorBoundaryWithRecovery 
    @error="handleGlobalError"
    @retry="handleRetry"
    @recovered="handleRecovery"
    :enable-auto-retry="true"
    :max-retries="3"
    :retry-strategy="'exponential'"
    :enable-partial-recovery="true"
    component="Application"
  >
    <div>
      <!-- Skip to main content link for keyboard users -->
      <a 
        href="#main-content" 
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      
      <RouteErrorBoundary>
        <MobileLayout>
          <main id="main-content">
            <router-view v-slot="{ Component, route }">
              <transition :name="(route.meta.transition as string) || 'fade'" mode="out-in">
                <component :is="Component" :key="route.path" />
              </transition>
            </router-view>
          </main>
        </MobileLayout>
      </RouteErrorBoundary>
      
      <!-- Consent banner (web) or modal (native mobile) -->
      <ConsentBanner />
      <ConsentModal />

      <!-- Global toast notifications -->
      <ToastContainer />

      <!-- Global error notification (for development) -->
      <div v-if="globalError && isDevelopment" class="global-error-toast">
        <div class="error-content">
          <span>⚠️ {{ globalError.message }}</span>
          <button @click="clearGlobalError" class="close-button">×</button>
        </div>
      </div>
      
      <!-- Recovery notification -->
      <div v-if="showRecoveryNotification" class="recovery-notification">
        <div class="recovery-content">
          <span>✅ Application recovered successfully!</span>
          <button @click="showRecoveryNotification = false" class="close-button">×</button>
        </div>
      </div>
    </div>
  </ErrorBoundaryWithRecovery>
</template>

<script setup lang="ts">
import { logger } from '@/utils/logger'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { App } from '@capacitor/app'
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics'
import { seedDatabase } from '@/data/repo/mock/seedData'
import MobileLayout from '@/components/layout/MobileLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ConsentBanner from '@/components/ConsentBanner.vue'
import ConsentModal from '@/components/ConsentModal.vue'
import ErrorBoundaryWithRecovery from '@/components/ui/ErrorBoundaryWithRecovery.vue'
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary.vue'
import { useErrorManager } from '@/utils/errorManager'

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
const { reportError, onError } = useErrorManager()
const router = useRouter()

const globalError = ref<Error | null>(null)
const isDevelopment = computed(() => import.meta.env.DEV)
const showRecoveryNotification = ref(false)

// Listen for global errors
onError((errorReport) => {
  if (isDevelopment.value) {
    globalError.value = errorReport.error
    // Auto-clear after 5 seconds
    setTimeout(() => {
      globalError.value = null
    }, 5000)
  }
})

function handleGlobalError(error: Error, errorInfo: any) {
  reportError(error, 'Global', window.location.pathname)
}

function handleRetry(retryCount: number) {
  logger.debug(`Application retry attempt ${retryCount}`)
}

function handleRecovery() {
  logger.debug('Application recovered successfully')
  showRecoveryNotification.value = true
  
  // Auto-hide recovery notification after 5 seconds
  setTimeout(() => {
    showRecoveryNotification.value = false
  }, 5000)
}

function clearGlobalError() {
  globalError.value = null
}

onMounted(async () => {
  // Initialize Crashlytics
  try {
    await FirebaseCrashlytics.setEnabled({ enabled: true })
    logger.debug('Crashlytics initialized')
  } catch (error) {
    logger.warn('Failed to initialize Crashlytics:', { error })
  }

  // In Firebase mode, auth listener is initialized in bootstrap
  // In Mock mode, seed database on first launch
  if (!isFirebaseMode) {
    try {
      await seedDatabase()
    } catch (error) {
      reportError(error as Error, 'AppBootstrap', '/')
    }
  }

  // Handle Android hardware back button
  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      // If there's no history, let the default behavior happen (exit app)
      App.exitApp()
    } else {
      // Navigate back through Vue Router history
      router.back()
    }
  })

  // Handle deep links (e.g., from Google Play Store subscription management)
  App.addListener('appUrlOpen', (data) => {
    logger.debug('Deep link opened:', { url: data.url })
    
    // Parse the deep link URL
    const url = new URL(data.url)
    
    // Handle custom scheme deep links
    if (url.protocol === 'twosubscribe:') {
      const path = url.pathname || url.host
      
      // Map deep link paths to router paths
      if (path === 'manage-subscriptions' || path === '/manage-subscriptions') {
        router.push('/platform-subscription')
      }
    }
  })
})

onUnmounted(() => {
  // Clean up back button listener
  App.removeAllListeners()
})
</script>

<style scoped>
.global-error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #7f1d1d;
  font-size: 0.875rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.close-button {
  background: none;
  border: none;
  color: #7f1d1d;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: #dc2626;
}

.recovery-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.recovery-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  color: #166534;
  font-size: 0.875rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Native-style page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for iOS-like navigation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-20%);
  opacity: 0;
}
</style>
