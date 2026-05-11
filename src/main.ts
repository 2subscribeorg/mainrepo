import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { bootstrapApp } from './config/bootstrap'
import { initializeStorageMigration } from './utils/storageMigration'
import { Capacitor } from '@capacitor/core';
import { Purchases } from '@revenuecat/purchases-capacitor';

const app = createApp(App)

// Initialize Pinia BEFORE bootstrap (bootstrap uses stores)
app.use(createPinia())
app.use(router)

// Bootstrap application (initializes Firebase if needed)
;(async () => {
  await bootstrapApp()
  
  // Initialize storage migration for PII protection
  try {
    await initializeStorageMigration()
  } catch (error) {
    console.warn('Storage migration initialization failed:', error)
  }
  
  app.mount('#app')
})()

if (Capacitor.isNativePlatform()) {
  Purchases.configure({ apiKey: 'test_kwJGoVxciLoquOeReKaEVUTyaZe' });
}
