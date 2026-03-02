import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { bootstrapApp } from './config/bootstrap'

const app = createApp(App)

// Initialize Pinia BEFORE bootstrap (bootstrap uses stores)
app.use(createPinia())
app.use(router)

// Bootstrap application (initializes Firebase if needed)
await bootstrapApp()

app.mount('#app')
