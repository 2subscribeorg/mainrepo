/**
 * PII Encryption Demo Script
 * 
 * Demonstrates the before/after of localStorage encryption
 * Run this in browser console to see the difference
 */

import { secureStorage } from '@/utils/secureStorage'

// Demo data
const sensitiveData = {
  rejectedMerchants: ['netflix', 'spotify', 'onlyfans'],
  userPreferences: {
    currency: 'GBP',
    notifications: true
  }
}

export async function demonstrateEncryption() {
  console.group('🔐 PII Encryption Demo')
  
  const userId = 'demo-user-123'
  const key = `rejected_merchants_${userId}`
  
  // 1. Show BEFORE (plaintext)
  console.log('❌ BEFORE - Plaintext Storage:')
  localStorage.setItem(key, JSON.stringify(sensitiveData.rejectedMerchants))
  console.log('Raw localStorage:', localStorage.getItem(key))
  console.log('Readable:', JSON.parse(localStorage.getItem(key) || '{}'))
  
  // 2. Clear and show AFTER (encrypted)
  localStorage.removeItem(key)
  
  console.log('\n✅ AFTER - Encrypted Storage:')
  await secureStorage.set(key, sensitiveData.rejectedMerchants, userId)
  console.log('Raw localStorage:', localStorage.getItem(key))
  
  // Show it's encrypted
  const stored = localStorage.getItem(key) || '{}'
  try {
    const parsed = JSON.parse(stored)
    console.log('Encrypted metadata:', {
      encrypted: parsed.metadata?.encrypted,
      version: parsed.metadata?.version,
      timestamp: parsed.metadata?.timestamp
    })
    console.log('Encrypted data (first 50 chars):', parsed.data?.substring(0, 50) + '...')
  } catch (e) {
    console.log('Data is encrypted and not readable without key')
  }
  
  // 3. Show decryption works
  console.log('\n🔓 Decryption Test:')
  const decrypted = await secureStorage.get(key, userId)
  console.log('Successfully decrypted:', decrypted)
  
  // 4. Show different user can't decrypt
  console.log('\n🚫 Security Test (different user):')
  try {
    const otherUserDecrypted = await secureStorage.get(key, 'other-user-456')
    console.log('Other user result:', otherUserDecrypted || 'Cannot decrypt (as expected)')
  } catch (e) {
    console.log('Other user cannot decrypt (expected behavior)')
  }
  
  // 5. Cleanup
  localStorage.removeItem(key)
  console.log('\n✨ Demo completed - localStorage cleaned up')
  
  console.groupEnd()
}

// Export for manual testing
export { secureStorage }

// Auto-run in development
if (import.meta.env.DEV) {
  // Uncomment to auto-run demo
  // setTimeout(demonstrateEncryption, 1000)
}
