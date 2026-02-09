<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    @click.self="handleCancel"
  >
    <div class="w-full max-w-md max-h-[90vh] flex flex-col rounded-lg bg-white shadow-xl overflow-hidden">
      <!-- Fixed Header -->
      <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Connect Your Bank</h3>
        <button
          class="text-gray-400 hover:text-gray-600"
          @click="handleCancel"
        >
          ✕
        </button>
      </div>

      <div v-if="!connecting" class="flex-1 overflow-y-auto">
        <div class="p-6">
          <!-- Bank Selection -->
          <p class="text-sm text-gray-600 mb-4">
            Select your bank to connect (Mock Mode - No real connection)
          </p>

          <div class="space-y-2">
            <button
              v-for="bank in mockBanks"
              :key="bank.id"
              class="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              @click="handleSelectBank(bank)"
            >
              <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <svg class="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
              <span class="font-medium text-gray-900">{{ bank.name }}</span>
            </button>
          </div>

          <p class="mt-4 text-xs text-gray-500">
            💡 This is a mock interface. In production, this would open Plaid Link for secure bank authentication.
          </p>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center p-6">
        <div class="text-center">
          <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p class="mt-4 text-sm text-gray-600">Connecting to {{ selectedBank?.name }}...</p>
          <p class="mt-1 text-xs text-gray-500">Please wait</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  complete: [publicToken: string]
  cancel: []
}>()

const mockBanks = [
  { id: 'barclays', name: 'Barclays' },
  { id: 'hsbc', name: 'HSBC UK' },
  { id: 'lloyds', name: 'Lloyds Bank' },
  { id: 'natwest', name: 'NatWest' },
  { id: 'santander', name: 'Santander UK' },
  { id: 'first-direct', name: 'First Direct' },
  { id: 'monzo', name: 'Monzo' },
  { id: 'starling', name: 'Starling Bank' },
  { id: 'revolut', name: 'Revolut' },
]

const connecting = ref(false)
const selectedBank = ref<typeof mockBanks[0] | null>(null)

async function handleSelectBank(bank: typeof mockBanks[0]) {
  selectedBank.value = bank
  connecting.value = true

  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Generate mock public token
  const publicToken = `public-mock-${bank.id}-${crypto.randomUUID()}`
  
  emit('complete', publicToken)
  connecting.value = false
}

function handleCancel() {
  if (!connecting.value) {
    emit('cancel')
  }
}
</script>
