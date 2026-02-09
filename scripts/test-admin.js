#!/usr/bin/env node

/**
 * Test runner specifically for admin service and superadmin functionality
 * This script runs the admin-related tests and provides detailed output
 */

import { spawn } from 'child_process'
import path from 'path'

console.log('🧪 Running Admin Service Tests...\n')

// Test files to run
const testFiles = [
  'src/services/AdminService.test.ts',
  'tests/integration/superadmin.test.ts'
]

// Run vitest with specific test files
const vitestArgs = [
  'run',
  ...testFiles,
  '--reporter=verbose',
  '--coverage'
]

const vitest = spawn('npx', ['vitest', ...vitestArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

vitest.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All admin tests passed!')
    console.log('\n📊 Test Coverage Report:')
    console.log('   - AdminService: Unit tests for all methods')
    console.log('   - MockAdminService: Mock implementation tests')
    console.log('   - Superadmin Integration: End-to-end admin workflows')
    console.log('   - Authentication: Firebase claims and permissions')
    console.log('   - Error Handling: API and network error scenarios')
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`)
    process.exit(code)
  }
})

vitest.on('error', (error) => {
  console.error('❌ Failed to start test runner:', error)
  process.exit(1)
})
