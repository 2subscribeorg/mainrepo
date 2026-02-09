<template>
  <div class="plaid-link-container">
    <button 
      ref="buttonRef"
      @click="openPlaidLink" 
      :disabled="loading || connectingBank"
      class="connect-bank-button btn-animated gpu-accelerated"
    >
      <span v-if="loading">Creating connection...</span>
      <span v-else-if="connectingBank">Connecting...</span>
      <span v-else>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        Connect Bank Account
      </span>
    </button>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBankAccountsStore } from '@/stores/bankAccounts'
import { useTransactionsStore } from '@/stores/transactions'
import { useAuthStore } from '@/stores/auth'
import { useAnimations } from '@/utils/useAnimations'

// TypeScript declarations for global window properties
declare global {
  interface Window {
    Plaid: any
    plaidScriptLoading?: boolean
  }
}

const emit = defineEmits<{
  success: []
  error: [error: string]
}>()

const loading = ref(false)
const connectingBank = ref(false)
const error = ref('')
const bankStore = useBankAccountsStore()
const transactionStore = useTransactionsStore()
const authStore = useAuthStore()

// Use animation utilities
const { createRipple, prefersReducedMotion } = useAnimations()
const buttonRef = ref<HTMLElement>()

// Load Plaid Link script (singleton pattern)
onMounted(() => {
  loadPlaidScript()
})

// Global function to ensure Plaid script is loaded only once
function loadPlaidScript() {
  if (!window.Plaid && !window.plaidScriptLoading) {
    window.plaidScriptLoading = true
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    script.onload = () => {
      window.plaidScriptLoading = false
    }
    script.onerror = () => {
      window.plaidScriptLoading = false
      console.error('Failed to load Plaid Link script')
    }
    document.head.appendChild(script)
  }
}

async function openPlaidLink(event: MouseEvent) {
  // Add ripple effect
  if (buttonRef.value && !prefersReducedMotion.value) {
    createRipple(event, buttonRef.value)
  }
  
  loading.value = true
  error.value = ''
  
  try {
    console.log('🔗 Initializing Plaid Link...')
    console.log('Environment:', import.meta.env.VITE_PLAID_ENV)
    console.log('Client ID:', import.meta.env.VITE_PLAID_CLIENT_ID?.substring(0, 10) + '...')
    
    // Check authentication
    if (!authStore.user) {
      throw new Error('You must be logged in to connect a bank account')
    }
    console.log('✅ User authenticated:', authStore.user.email)
    
    // Get link token from backend
    console.log('📝 Requesting link token...')
    const { linkToken } = await bankStore.connectBank()
    console.log('✅ Link token received:', linkToken.substring(0, 20) + '...')
    
    // Check if Plaid SDK is loaded
    if (!window.Plaid) {
      throw new Error('Plaid SDK not loaded. Please refresh the page.')
    }
    
    // Initialize Plaid Link
    console.log('🚀 Opening Plaid Link UI...')
    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: handleSuccess,
      onExit: handleExit,
      onEvent: handleEvent,
    })
    
    // Open Plaid Link
    handler.open()
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize connection'
    error.value = errorMessage
    emit('error', errorMessage)
    
    console.error('❌ Plaid Link initialization failed:')
    console.error('Error:', err)
    console.error('Error details:', {
      message: errorMessage,
      stack: err instanceof Error ? err.stack : 'No stack trace',
      type: err instanceof Error ? err.constructor.name : typeof err
    })
  } finally {
    loading.value = false
  }
}

async function handleSuccess(publicToken: string, metadata: any) {
  connectingBank.value = true
  error.value = ''
  
  try {
    console.log('✅ Plaid Link success:', metadata?.institution?.name || 'Bank connected')
    
    // Complete the connection (exchange token)
    await bankStore.completeConnection(publicToken)
    
    // Get the newly created connection
    const connections = bankStore.connections
    const newConnection = connections[connections.length - 1]
    
    if (newConnection) {
      console.log('🔄 Syncing transactions for', newConnection.institutionName)
      
      // Sync transactions immediately
      await bankStore.syncTransactions(newConnection.id)
      
      // Refresh transactions in the store
      await transactionStore.fetchTransactions()
      
      // Detect patterns in the new transactions
      console.log('🔍 Running subscription detection...')
      await transactionStore.detectPatterns()
    }
    
    emit('success')
    console.log('🎉 Bank connection complete!')
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to complete connection'
    emit('error', error.value)
    console.error('❌ Failed to complete connection:', err)
  } finally {
    connectingBank.value = false
  }
}

function handleExit(err: any, _metadata: any) {
  if (err) {
    error.value = 'Connection cancelled or failed'
    console.log('⚠️ Plaid Link exited with error:', err)
  } else {
    console.log('ℹ️ User closed Plaid Link')
  }
  connectingBank.value = false
}

function handleEvent(eventName: string, _metadata: any) {
  console.log('📊 Plaid event:', eventName)
}

// Declare Plaid on window
declare global {
  interface Window {
    Plaid: any
  }
}
</script>

<style scoped>
.plaid-link-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.connect-bank-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-micro) var(--ease-out);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateZ(0); /* GPU acceleration */
}

.connect-bank-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.connect-bank-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.connect-bank-button svg {
  width: 20px;
  height: 20px;
}

.error-message {
  padding: 0.75rem 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c00;
  font-size: 0.875rem;
}
</style>
