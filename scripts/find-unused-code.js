#!/usr/bin/env node

/**
 * Automated Redundant Code Detection Script
 * Finds unused files, imports, exports, and dependencies
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class CodeCleanupAnalyzer {
  constructor(srcDir = './src') {
    this.srcDir = srcDir
    this.results = {
      unusedFiles: [],
      unusedImports: [],
      unusedExports: [],
      deadCode: [],
      riskAssessment: {}
    }
  }

  async analyze() {
    console.log('🔍 Starting comprehensive code cleanup analysis...\n')
    
    this.findUnusedFiles()
    this.findUnusedImports()
    this.findDeadCode()
    this.assessRisk()
    this.generateReport()
  }

  findUnusedFiles() {
    console.log('📁 Scanning for unused files...')
    
    const allFiles = this.getAllFiles(this.srcDir, ['.ts', '.vue', '.js'])
    const importedFiles = new Set()
    
    // Find all import statements
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8')
      const imports = content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g) || []
      
      imports.forEach(imp => {
        const match = imp.match(/from\s+['"`]([^'"`]+)['"`]/)
        if (match) {
          let importPath = match[1]
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            importPath = path.resolve(path.dirname(file), importPath)
            // Try different extensions
            const extensions = ['.ts', '.vue', '.js', '/index.ts', '/index.js']
            for (const ext of extensions) {
              const fullPath = importPath + ext
              if (fs.existsSync(fullPath)) {
                importedFiles.add(fullPath)
                break
              }
            }
          }
        }
      })
    })
    
    this.results.unusedFiles = allFiles.filter(file => 
      !importedFiles.has(file) && 
      !file.includes('main.ts') && 
      !file.includes('App.vue') &&
      !file.includes('.test.') &&
      !file.includes('.spec.')
    )
    
    console.log(`   Found ${this.results.unusedFiles.length} potentially unused files`)
  }

  findUnusedImports() {
    console.log('📦 Scanning for unused imports...')
    
    const allFiles = this.getAllFiles(this.srcDir, ['.ts', '.vue', '.js'])
    
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8')
      const imports = content.match(/import\s+{([^}]+)}\s+from/g) || []
      
      imports.forEach(imp => {
        const match = imp.match(/import\s+{([^}]+)}\s+from/)
        if (match) {
          const importedItems = match[1].split(',').map(item => item.trim())
          importedItems.forEach(item => {
            const cleanItem = item.replace(/\s+as\s+\w+/, '').trim()
            if (!content.includes(cleanItem) || content.indexOf(cleanItem) === content.indexOf(imp)) {
              this.results.unusedImports.push({
                file: file.replace(process.cwd(), ''),
                import: cleanItem,
                line: imp
              })
            }
          })
        }
      })
    })
    
    console.log(`   Found ${this.results.unusedImports.length} potentially unused imports`)
  }

  findDeadCode() {
    console.log('💀 Scanning for dead code patterns...')
    
    const allFiles = this.getAllFiles(this.srcDir, ['.ts', '.vue', '.js'])
    const deadPatterns = [
      /if\s*\(\s*false\s*\)/g,
      /if\s*\(\s*0\s*\)/g,
      /\/\*[\s\S]*?\*\//g, // Block comments with code
      /\/\/.*function.*\(/g, // Commented function definitions
    ]
    
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8')
      const lines = content.split('\n')
      
      deadPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern) || []
        matches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length
          this.results.deadCode.push({
            file: file.replace(process.cwd(), ''),
            line: lineNumber,
            pattern: ['unreachable if(false)', 'unreachable if(0)', 'commented code block', 'commented function'][index],
            code: match.substring(0, 100) + (match.length > 100 ? '...' : '')
          })
        })
      })
    })
    
    console.log(`   Found ${this.results.deadCode.length} dead code patterns`)
  }

  assessRisk() {
    console.log('⚖️  Assessing deletion risk levels...')
    
    const riskCategories = {
      low: [],
      medium: [],
      high: [],
      critical: []
    }
    
    // Categorize unused files by risk
    this.results.unusedFiles.forEach(file => {
      const relativePath = file.replace(process.cwd(), '')
      
      if (file.includes('/test/') || file.includes('/__tests__/') || file.includes('.test.') || file.includes('.spec.')) {
        riskCategories.low.push({ type: 'file', path: relativePath, reason: 'Test file' })
      } else if (file.includes('/utils/') || file.includes('/helpers/') || file.includes('/constants/')) {
        riskCategories.low.push({ type: 'file', path: relativePath, reason: 'Utility file' })
      } else if (file.includes('/components/') && !file.includes('/views/')) {
        riskCategories.medium.push({ type: 'file', path: relativePath, reason: 'Component file' })
      } else if (file.includes('/services/') || file.includes('/stores/')) {
        riskCategories.high.push({ type: 'file', path: relativePath, reason: 'Business logic file' })
      } else {
        riskCategories.critical.push({ type: 'file', path: relativePath, reason: 'Core application file' })
      }
    })
    
    // Categorize unused imports
    this.results.unusedImports.forEach(imp => {
      if (imp.import.includes('test') || imp.import.includes('mock')) {
        riskCategories.low.push({ type: 'import', ...imp, reason: 'Test-related import' })
      } else if (imp.import.includes('util') || imp.import.includes('helper')) {
        riskCategories.low.push({ type: 'import', ...imp, reason: 'Utility import' })
      } else {
        riskCategories.medium.push({ type: 'import', ...imp, reason: 'Regular import' })
      }
    })
    
    this.results.riskAssessment = riskCategories
    
    console.log(`   Low risk: ${riskCategories.low.length} items`)
    console.log(`   Medium risk: ${riskCategories.medium.length} items`)
    console.log(`   High risk: ${riskCategories.high.length} items`)
    console.log(`   Critical risk: ${riskCategories.critical.length} items`)
  }

  generateReport() {
    console.log('\n📊 CLEANUP ANALYSIS REPORT')
    console.log('=' .repeat(50))
    
    console.log('\n🟢 LOW RISK - Safe to delete:')
    this.results.riskAssessment.low.forEach(item => {
      console.log(`   ${item.type}: ${item.path || item.file} (${item.reason})`)
    })
    
    console.log('\n🟡 MEDIUM RISK - Delete with testing:')
    this.results.riskAssessment.medium.forEach(item => {
      console.log(`   ${item.type}: ${item.path || item.file} (${item.reason})`)
    })
    
    console.log('\n🟠 HIGH RISK - Deprecate first:')
    this.results.riskAssessment.high.forEach(item => {
      console.log(`   ${item.type}: ${item.path || item.file} (${item.reason})`)
    })
    
    console.log('\n🔴 CRITICAL RISK - Do not delete:')
    this.results.riskAssessment.critical.forEach(item => {
      console.log(`   ${item.type}: ${item.path || item.file} (${item.reason})`)
    })
    
    if (this.results.deadCode.length > 0) {
      console.log('\n💀 DEAD CODE PATTERNS:')
      this.results.deadCode.forEach(item => {
        console.log(`   ${item.file}:${item.line} - ${item.pattern}`)
      })
    }
    
    console.log('\n📋 RECOMMENDED ACTIONS:')
    console.log('1. Start with LOW RISK items')
    console.log('2. Run tests after each deletion')
    console.log('3. Commit changes atomically')
    console.log('4. Review MEDIUM RISK items with team')
    console.log('5. Never delete CRITICAL RISK items without migration plan')
  }

  getAllFiles(dir, extensions) {
    let files = []
    
    const items = fs.readdirSync(dir)
    
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files = files.concat(this.getAllFiles(fullPath, extensions))
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath)
      }
    }
    
    return files
  }
}

// Run the analysis
const analyzer = new CodeCleanupAnalyzer()
analyzer.analyze().catch(console.error)

export default CodeCleanupAnalyzer
