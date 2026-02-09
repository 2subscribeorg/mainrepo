import type { CheckoutOptions, PurchaseResult } from '@/types/billing'

/**
 * Mock Paddle service that simulates the Paddle.js SDK
 */
class MockPaddleService {
  private isInitialized = false

  /**
   * Initialize Paddle (simulates Paddle.Initialize)
   */
  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100))
    this.isInitialized = true
    console.log('✅ Mock Paddle: Initialized')
  }

  /**
   * Start checkout process (simulates Paddle.Checkout.open)
   */
  async startCheckout(options: CheckoutOptions): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      throw new Error('Paddle not initialized. Call initialize() first.')
    }

    return new Promise((resolve) => {
      // Create and show mock checkout modal
      this.showCheckoutModal(options, resolve)
    })
  }

  private showCheckoutModal(
    options: CheckoutOptions, 
    onComplete: (result: PurchaseResult) => void
  ): void {
    // Create modal backdrop
    const backdrop = document.createElement('div')
    backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    backdrop.style.zIndex = '9999'

    // Create modal content
    const modal = document.createElement('div')
    modal.className = 'bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl'
    modal.innerHTML = `
      <div class="text-center">
        <div class="mb-4">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Mock Paddle Checkout</h3>
          <p class="text-gray-600 text-sm mb-4">This is a mock payment interface for development</p>
          <div class="bg-gray-50 rounded-lg p-3 mb-4">
            <p class="text-sm text-gray-700">Price ID: <span class="font-mono text-xs">${options.priceId}</span></p>
          </div>
        </div>
        
        <div class="space-y-3">
          <button id="mock-complete-payment" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Complete Payment
          </button>
          <button id="mock-cancel-payment" class="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    `

    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    // Add event listeners
    const completeBtn = modal.querySelector('#mock-complete-payment')
    const cancelBtn = modal.querySelector('#mock-cancel-payment')

    const cleanup = () => {
      document.body.removeChild(backdrop)
    }

    completeBtn?.addEventListener('click', () => {
      cleanup()
      const transactionId = `txn_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('✅ Mock Paddle: Payment completed with transaction', transactionId)
      onComplete({
        success: true,
        transactionId
      })
    })

    cancelBtn?.addEventListener('click', () => {
      cleanup()
      console.log('❌ Mock Paddle: Payment cancelled')
      onComplete({
        success: false,
        error: 'Payment cancelled by user'
      })
    })

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        cleanup()
        onComplete({
          success: false,
          error: 'Payment cancelled by user'
        })
      }
    })

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape)
        cleanup()
        onComplete({
          success: false,
          error: 'Payment cancelled by user'
        })
      }
    }
    document.addEventListener('keydown', handleEscape)
  }
}

// Export singleton instance
export const mockPaddle = new MockPaddleService()
