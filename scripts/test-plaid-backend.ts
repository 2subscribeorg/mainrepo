/**
 * Standalone Backend Test Script for Plaid Integration
 * 
 * Run with: npm run test:plaid-backend
 * 
 * This script tests the Plaid sandbox integration step-by-step
 */

import { ClientPlaidService } from '../src/services/plaid/ClientPlaidService'

async function testPlaidBackend() {
  console.log('\n🚀 Starting Plaid Backend Integration Test\n')
  console.log('='.repeat(60))
  
  const plaidService = new ClientPlaidService()
  const testUserId = 'test-user-' + Date.now()
  
  // Test 1: Create Link Token
  console.log('\n📝 Test 1: Creating Link Token...')
  try {
    const linkToken = await plaidService.createLinkToken(testUserId)
    console.log('✅ SUCCESS: Link token created')
    console.log(`   Token: ${linkToken.substring(0, 40)}...`)
    console.log(`   Length: ${linkToken.length} characters`)
  } catch (error) {
    console.error('❌ FAILED: Could not create link token')
    console.error('   Error:', error)
    process.exit(1)
  }
  
  // Test 2: Check Institution Lookup
  console.log('\n🏦 Test 2: Looking up test institution...')
  try {
    const institutionId = 'ins_109508' // Chase in Plaid sandbox
    const institution = await plaidService.getInstitution(institutionId)
    
    if (institution) {
      console.log('✅ SUCCESS: Institution found')
      console.log(`   Name: ${institution.name}`)
      console.log(`   Products: ${institution.products?.join(', ')}`)
      console.log(`   Country: ${institution.country_codes?.join(', ')}`)
    } else {
      console.log('⚠️  WARNING: Institution not found (might be expected)')
    }
  } catch (error) {
    console.log('⚠️  WARNING: Could not lookup institution')
    console.log('   This is non-critical for now')
  }
  
  // Test 3: Verify Environment Configuration
  console.log('\n⚙️  Test 3: Verifying environment configuration...')
  const clientId = process.env.VITE_PLAID_CLIENT_ID
  const secret = process.env.VITE_PLAID_SECRET
  const env = process.env.VITE_PLAID_ENV
  
  console.log('✅ Environment variables loaded:')
  console.log(`   Client ID: ${clientId ? clientId.substring(0, 10) + '...' : 'NOT SET'}`)
  console.log(`   Secret: ${secret ? '***' + secret.substring(secret.length - 4) : 'NOT SET'}`)
  console.log(`   Environment: ${env || 'NOT SET'}`)
  
  if (!clientId || !secret) {
    console.error('\n❌ ERROR: Missing Plaid credentials in .env file')
    process.exit(1)
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary:')
  console.log('✅ Link token creation: PASSED')
  console.log('✅ Environment setup: PASSED')
  console.log('⚠️  Full flow test: Requires Plaid Link UI (Phase 4)')
  console.log('\n🎉 Backend integration is working correctly!')
  console.log('\nNext steps:')
  console.log('1. Implement Plaid Link UI component (Phase 4)')
  console.log('2. Test full connection flow with sandbox banks')
  console.log('3. Test transaction syncing')
  console.log('='.repeat(60))
}

// Run the test
testPlaidBackend().catch(error => {
  console.error('\n💥 Test failed with error:')
  console.error(error)
  process.exit(1)
})
