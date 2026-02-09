#!/usr/bin/env node

/**
 * Safe Code Cleanup Script
 * Automatically removes low-risk redundant code
 */

import fs from 'fs'
import path from 'path'

class SafeCodeCleaner {
  constructor() {
    this.cleaned = []
    this.errors = []
  }

  async cleanLowRiskItems() {
    console.log('🧹 Starting safe cleanup of low-risk items...\n')
    
    // Clean up unused dependencies first
    await this.cleanUnusedDependencies()
    
    // Clean up debug components
    await this.cleanDebugComponents()
    
    // Clean up commented code blocks (selective)
    await this.cleanCommentedCode()
    
    this.generateCleanupReport()
  }

  async cleanUnusedDependencies() {
    console.log('📦 Cleaning unused dependencies...')
    
    const unusedDeps = [
      '@capacitor/android',
      '@capacitor/core', 
      '@capacitor/ios',
      '@capacitor/local-notifications',
      'plaid', // Frontend no longer needs direct Plaid API
      'react-plaid-link' // Not using React Plaid Link
    ]
    
    // Note: We'll suggest removal but not auto-remove to be safe
    console.log('   Suggested npm uninstall commands:')
    unusedDeps.forEach(dep => {
      console.log(`   npm uninstall ${dep}`)
    })
    
    this.cleaned.push(`Identified ${unusedDeps.length} unused dependencies for manual removal`)
  }

  async cleanDebugComponents() {
    console.log('🔧 Cleaning debug components...')
    
    const debugFiles = [
      'src/components/debug/TransactionDebug.vue'
    ]
    
    debugFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file)
          this.cleaned.push(`Removed debug component: ${file}`)
          console.log(`   ✅ Removed: ${file}`)
        } catch (error) {
          this.errors.push(`Failed to remove ${file}: ${error.message}`)
          console.log(`   ❌ Failed to remove: ${file}`)
        }
      }
    })
    
    // Remove debug directory if empty
    const debugDir = 'src/components/debug'
    if (fs.existsSync(debugDir)) {
      try {
        const files = fs.readdirSync(debugDir)
        if (files.length === 0) {
          fs.rmdirSync(debugDir)
          this.cleaned.push(`Removed empty debug directory: ${debugDir}`)
          console.log(`   ✅ Removed empty directory: ${debugDir}`)
        }
      } catch (error) {
        this.errors.push(`Failed to remove directory ${debugDir}: ${error.message}`)
      }
    }
  }

  async cleanCommentedCode() {
    console.log('💬 Cleaning obvious commented code blocks...')
    
    const filesToClean = [
      'src/data/repo/firebase/FirebaseBankAccountsRepo.ts'
    ]
    
    filesToClean.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          let content = fs.readFileSync(file, 'utf8')
          const originalLength = content.length
          
          // Remove obvious commented-out import statements
          content = content.replace(/\/\/\s*import\s+.*from.*\n/g, '')
          
          // Remove obvious commented-out function calls
          content = content.replace(/\/\/\s*\w+\.\w+\(.*\)\s*\n/g, '')
          
          // Remove empty comment lines
          content = content.replace(/^\s*\/\/\s*$/gm, '')
          
          if (content.length !== originalLength) {
            fs.writeFileSync(file, content)
            this.cleaned.push(`Cleaned commented code in: ${file}`)
            console.log(`   ✅ Cleaned: ${file}`)
          }
        } catch (error) {
          this.errors.push(`Failed to clean ${file}: ${error.message}`)
          console.log(`   ❌ Failed to clean: ${file}`)
        }
      }
    })
  }

  generateCleanupReport() {
    console.log('\n📊 CLEANUP REPORT')
    console.log('=' .repeat(40))
    
    console.log(`\n✅ Successfully cleaned ${this.cleaned.length} items:`)
    this.cleaned.forEach(item => console.log(`   ${item}`))
    
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`)
      this.errors.forEach(error => console.log(`   ${error}`))
    }
    
    console.log('\n📋 MANUAL ACTIONS REQUIRED:')
    console.log('1. Run: npm uninstall @capacitor/android @capacitor/core @capacitor/ios @capacitor/local-notifications plaid react-plaid-link')
    console.log('2. Run: npm run build (to verify nothing broke)')
    console.log('3. Run: npm run test (to verify tests pass)')
    console.log('4. Commit changes: git add -A && git commit -m "cleanup: remove low-risk redundant code"')
    
    console.log('\n🎯 NEXT STEPS:')
    console.log('- Review medium-risk items with team')
    console.log('- Set up automated cleanup checks in CI/CD')
    console.log('- Document cleanup guidelines for team')
  }
}

// Run the cleanup
const cleaner = new SafeCodeCleaner()
cleaner.cleanLowRiskItems().catch(console.error)
