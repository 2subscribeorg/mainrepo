import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { bootstrapApp } from './config/bootstrap'
import { initializeStorageMigration } from './utils/storageMigration'

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
