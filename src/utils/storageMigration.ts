/**
 * Storage Migration Script
 * 
 * Migrates existing plaintext localStorage data to encrypted storage
 * Runs automatically on app initialization for authenticated users
 */

import { logger } from '@/utils/logger'
import { secureStorage } from '@/utils/secureStorage'
import { useAuth } from '@/composables/useAuth'

// Keys that contain PII and should be encrypted
const PII_KEYS = [
  'rejected_merchants_',
  'auth_user',
  'user_preferences',
  'bank_connection_',
  'subscription_preferences',
  'category_preferences'
]

// Keys that should be migrated but not encrypted (non-sensitive)
const MIGRATION_KEYS = [
  'app_settings',
  'ui_preferences',
  'theme_settings'
]

interface MigrationResult {
  success: boolean
  migrated: string[]
  failed: string[]
  skipped: string[]
}

/**
 * Check if migration is needed
 */
function needsMigration(): boolean {
  try {
    const migrationFlag = localStorage.getItem('storage_migration_v1')
    return migrationFlag !== 'completed'
  } catch {
    return true
  }
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
  try {
    localStorage.setItem('storage_migration_v1', 'completed')
  } catch (error) {
    logger.warn('Failed to mark migration completed', error)
  }
}

/**
 * Get all localStorage keys for a user
 */
function getUserKeys(userId: string): string[] {
  try {
    return Object.keys(localStorage).filter(key => 
      key.includes(userId) || 
      PII_KEYS.some(pattern => key.startsWith(pattern)) ||
      MIGRATION_KEYS.some(pattern => key.startsWith(pattern))
    )
  } catch (error) {
    logger.error('Failed to get user keys from localStorage', error)
    return []
  }
}

/**
 * Migrate a single key
 */
async function migrateKey(key: string, userId: string): Promise<boolean> {
  try {
    const value = localStorage.getItem(key)
    if (!value) return true

    // Check if already encrypted
    if (secureStorage.isEncrypted?.(value)) {
      return true
    }

    // Parse the value
    let parsedValue: any
    try {
      parsedValue = JSON.parse(value)
    } catch {
      parsedValue = value
    }

    // Determine if encryption is needed
    const needsEncryption = PII_KEYS.some(pattern => key.includes(pattern))
    
    // Migrate to new storage
    if (needsEncryption) {
      const success = await secureStorage.set(key, parsedValue, userId)
      if (!success) {
        logger.warn('Failed to encrypt key during migration', { key })
        return false
      }
    } else {
      // Move to new format without encryption
      const payload = {
        metadata: {
          encrypted: false,
          version: '1.0',
          timestamp: Date.now()
        },
        data: parsedValue
      }
      localStorage.setItem(key, JSON.stringify(payload))
    }

    // Remove old plaintext data
    localStorage.removeItem(key)
    logger.debug('Successfully migrated key', { key, encrypted: needsEncryption })
    
    return true
  } catch (error) {
    logger.error('Failed to migrate key', error, { key })
    return false
  }
}

/**
 * Perform the migration
 */
async function performMigration(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: [],
    failed: [],
    skipped: []
  }

  try {
    const keys = getUserKeys(userId)
    logger.info('Starting storage migration', { keyCount: keys.length, userId })

    for (const key of keys) {
      try {
        const success = await migrateKey(key, userId)
        if (success) {
          result.migrated.push(key)
        } else {
          result.failed.push(key)
          result.success = false
        }
      } catch (error) {
        result.failed.push(key)
        result.success = false
        logger.error('Key migration failed', error, { key })
      }
    }

    // Mark migration as completed if successful
    if (result.success) {
      markMigrationCompleted()
      logger.success('Storage migration completed successfully', {
        migrated: result.migrated.length,
        failed: result.failed.length
      })
    } else {
      logger.warn('Storage migration completed with errors', {
        migrated: result.migrated.length,
        failed: result.failed.length,
        failedKeys: result.failed
      })
    }

  } catch (error) {
    logger.error('Storage migration failed', error)
    result.success = false
  }

  return result
}

/**
 * Initialize migration for authenticated users
 */
export async function initializeStorageMigration(): Promise<MigrationResult | null> {
  try {
    const { user } = useAuth()
    
    if (!user?.id) {
      logger.debug('No authenticated user, skipping migration')
      return null
    }

    if (!needsMigration()) {
      logger.debug('Storage migration already completed')
      return null
    }

    // Perform migration
    const result = await performMigration(user.id)
    
    // Log summary
    if (result.success) {
      logger.success('Storage migration completed', {
        migratedCount: result.migrated.length,
        failedCount: result.failed.length
      })
    } else {
      logger.warn('Storage migration completed with issues', result)
    }

    return result
  } catch (error) {
    logger.error('Failed to initialize storage migration', error)
    return null
  }
}

/**
 * Force migration (for testing or manual trigger)
 */
export async function forceMigration(userId: string): Promise<MigrationResult> {
  // Clear migration flag
  localStorage.removeItem('storage_migration_v1')
  
  // Perform migration
  return await performMigration(userId)
}

/**
 * Check migration status
 */
export function getMigrationStatus(): {
  completed: boolean
  keyCount: number
  encryptedCount: number
} {
  try {
    const completed = localStorage.getItem('storage_migration_v1') === 'completed'
    const allKeys = Object.keys(localStorage)
    const encryptedCount = allKeys.filter(key => {
      const value = localStorage.getItem(key)
      return value && secureStorage.isEncrypted?.(value)
    }).length

    return {
      completed,
      keyCount: allKeys.length,
      encryptedCount
    }
  } catch (error) {
    logger.error('Failed to get migration status', error)
    return {
      completed: false,
      keyCount: 0,
      encryptedCount: 0
    }
  }
}
