<template>
  <div>
    <!-- Skip to main content link for keyboard users -->
    <a 
      href="#main-content" 
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-white"
    >
      Skip to main content
    </a>
    
    <MobileLayout>
      <main id="main-content">
        <router-view />
      </main>
    </MobileLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { seedDatabase } from '@/data/repo/mock/seedData'
import { useAuth } from '@/composables/useAuth'
import MobileLayout from '@/components/layout/MobileLayout.vue'

const { initAuthListener } = useAuth()
const isFirebaseMode = import.meta.env.VITE_DATA_BACKEND === 'FIREBASE'

onMounted(async () => {
  // Initialize Firebase auth listener if in Firebase mode
  if (isFirebaseMode) {
    initAuthListener()
    console.log('🔥 Firebase auth listener initialized')
  } else {
    // Seed database on first launch (Mock mode only)
    await seedDatabase()
    console.log('📦 Mock database seeded')
  }
})
</script>
