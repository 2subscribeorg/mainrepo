import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { initializeFirebase } from './config/firebase'

// Initialize Firebase if using Firebase backend
if (import.meta.env.VITE_DATA_BACKEND === 'FIREBASE') {
  try {
    initializeFirebase()
    console.log('🔥 Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error)
  }
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
