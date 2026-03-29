/**
 * Migration Script: Replace console.log with logger utility
 * 
 * This script:
 * 1. Finds all console.log/warn/error statements
 * 2. Replaces them with appropriate logger calls
 * 3. Adds logger import if not present
 * 
 * Usage: node scripts/migrate-to-logger.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SRC_DIR = path.join(__dirname, '../src')
const EXTENSIONS = ['.ts', '.vue']

// Files to skip
const SKIP_FILES = [
  'logger.ts',
  'errorManager.ts', // Has TODO for proper logging
  'errorHandler.ts'  // Uses console for SafeStorage
]

let filesProcessed = 0
let replacementsMade = 0

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath)
  if (!EXTENSIONS.includes(ext)) return false
  
  const fileName = path.basename(filePath)
  if (SKIP_FILES.includes(fileName)) return false
  
  return true
}

/**
 * Get all files recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        getAllFiles(filePath, fileList)
      }
    } else if (shouldProcessFile(filePath)) {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

/**
 * Detect console statement type and context
 */
function analyzeConsoleStatement(line) {
  // Success patterns (✅, ✓, etc.)
  if (/console\.log\([^)]*['"`][✅✓][^)]*\)/.test(line)) {
    return 'success'
  }
  
  // API patterns
  if (/console\.log\([^)]*\[API\]/.test(line) || /console\.log\([^)]*API/.test(line)) {
    return 'api'
  }
  
  // Error patterns
  if (/console\.error/.test(line)) {
    return 'error'
  }
  
  // Warning patterns
  if (/console\.warn/.test(line)) {
    return 'warn'
  }
  
  // Debug patterns (🔍, 🔥, etc.)
  if (/console\.log\([^)]*['"`][🔍🔥📝🔄🔌][^)]*\)/.test(line)) {
    return 'debug'
  }
  
  // Default to debug for console.log
  return 'debug'
}

/**
 * Convert console statement to logger call
 */
function convertToLogger(line, type) {
  let converted = line
  
  switch (type) {
    case 'success':
      // Remove emoji from message since logger.success adds it
      converted = converted.replace(/console\.log\(/, 'logger.success(')
      converted = converted.replace(/['"`][✅✓]\s*/, '\'')
      break
      
    case 'api':
      // Keep as debug for now, can be manually converted to logger.api
      converted = converted.replace(/console\.log\(/, 'logger.debug(')
      break
      
    case 'error':
      converted = converted.replace(/console\.error\(/, 'logger.error(')
      break
      
    case 'warn':
      converted = converted.replace(/console\.warn\(/, 'logger.warn(')
      break
      
    case 'debug':
    default:
      converted = converted.replace(/console\.log\(/, 'logger.debug(')
      break
  }
  
  return converted
}

/**
 * Process a single file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const originalContent = content
  
  // Check if file has console statements
  if (!/console\.(log|warn|error)/.test(content)) {
    return
  }
  
  const lines = content.split('\n')
  let hasChanges = false
  let needsImport = false
  
  // Process each line
  const processedLines = lines.map(line => {
    if (/console\.(log|warn|error)/.test(line)) {
      const type = analyzeConsoleStatement(line)
      const converted = convertToLogger(line, type)
      
      if (converted !== line) {
        hasChanges = true
        needsImport = true
        replacementsMade++
        return converted
      }
    }
    return line
  })
  
  if (!hasChanges) return
  
  content = processedLines.join('\n')
  
  // Add import if needed
  if (needsImport && !content.includes("from '@/utils/logger'")) {
    const isVueFile = filePath.endsWith('.vue')
    
    if (isVueFile) {
      // For Vue files, add import in script section
      content = content.replace(
        /(<script[^>]*>)/,
        '$1\nimport { logger } from \'@/utils/logger\''
      )
    } else {
      // For TS files, add at top after existing imports
      const importMatch = content.match(/^import .+ from .+$/m)
      if (importMatch) {
        const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length
        content = content.slice(0, lastImportIndex) + 
                  '\nimport { logger } from \'@/utils/logger\'' +
                  content.slice(lastImportIndex)
      } else {
        // No imports found, add at top
        content = 'import { logger } from \'@/utils/logger\'\n\n' + content
      }
    }
  }
  
  // Write back to file
  fs.writeFileSync(filePath, content, 'utf8')
  filesProcessed++
  
  console.log(`✅ Processed: ${path.relative(SRC_DIR, filePath)} (${replacementsMade} replacements)`)
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Starting console.log migration to logger utility...\n')
  
  const files = getAllFiles(SRC_DIR)
  console.log(`Found ${files.length} files to process\n`)
  
  files.forEach(processFile)
  
  console.log('\n✅ Migration complete!')
  console.log(`   Files processed: ${filesProcessed}`)
  console.log(`   Replacements made: ${replacementsMade}`)
  console.log('\n⚠️  Manual review recommended for:')
  console.log('   - API logging (consider using logger.api())')
  console.log('   - Performance logging (consider using logger.perf())')
  console.log('   - Grouped logging (consider using logger.group())')
}

main()
