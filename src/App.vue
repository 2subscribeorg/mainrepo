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
            <router-view />
          </main>
        </MobileLayout>
      </RouteErrorBoundary>
      
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
import { ref, computed, onMounted } from 'vue'
import { seedDatabase } from '@/data/repo/mock/seedData'
import MobileLayout from '@/components/layout/MobileLayout.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ErrorBoundaryWithRecovery from '@/components/ui/ErrorBoundaryWithRecovery.vue'
import RouteErrorBoundary from '@/components/ui/RouteErrorBoundary.vue'
import { useErrorManager } from '@/utils/errorManager'

const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'
const { reportError, onError } = useErrorManager()

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
  console.log(`Application retry attempt ${retryCount}`)
}

function handleRecovery() {
  console.log('Application recovered successfully')
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
  // In Firebase mode, auth listener is initialized in bootstrap
  // In Mock mode, seed database on first launch
  if (!isFirebaseMode) {
    try {
      await seedDatabase()
    } catch (error) {
      reportError(error as Error, 'AppBootstrap', '/')
    }
  }
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
</style>
