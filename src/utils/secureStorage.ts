/**
 * Secure Storage Utility with PII Encryption
 * 
 * Provides encrypted localStorage for sensitive PII data
 * Uses AES-256 encryption with user-specific keys
 * 
 * @example
 * ```ts
 * // Encrypt sensitive data
 * await secureStorage.set('rejected_merchants_user123', ['netflix', 'spotify'])
 * 
 * // Decrypt sensitive data
 * const merchants = await secureStorage.get('rejected_merchants_user123')
 * ```
 */

import { logger } from '@/utils/logger'

interface EncryptionKey {
  key: CryptoKey
  iv: Uint8Array
  salt: Uint8Array
}

interface StorageMetadata {
  encrypted: boolean
  version: string
  timestamp: number
}

class SecureStorage {
  private static instance: SecureStorage
  private encryptionKeys: Map<string, EncryptionKey> = new Map()
  private readonly ALGORITHM = 'AES-GCM'
  private readonly KEY_LENGTH = 256
  private readonly IV_LENGTH = 12
  private readonly SALT_LENGTH = 16
  private readonly VERSION = '1.0'

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  /**
   * Generate user-specific encryption key
   */
  private async generateKey(userId: string): Promise<EncryptionKey> {
    try {
      // Generate salt
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
      
      // Derive key from user ID + device fingerprint
      const keyMaterial = await this.importKeyMaterial(userId, salt)
      
      // Derive encryption key
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      )

      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

      return { key, iv, salt }
    } catch (error) {
      logger.error('Failed to generate encryption key', error)
      throw new Error('Failed to generate encryption key')
    }
  }

  /**
   * Import key material from user ID
   */
  private async importKeyMaterial(userId: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
      // Combine user ID with device fingerprint for uniqueness
      const deviceFingerprint = this.getDeviceFingerprint()
      const combined = `${userId}:${deviceFingerprint}`
      
      return await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(combined),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      )
    } catch (error) {
      logger.error('Failed to import key material', error)
      throw new Error('Failed to import key material')
    }
  }

  /**
   * Generate device fingerprint for key derivation
   */
  private getDeviceFingerprint(): string {
    try {
      // Use browser characteristics for fingerprinting
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Device fingerprint', 2, 2)
      }
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|')
      
      return btoa(fingerprint).slice(0, 32)
    } catch (error) {
      // Fallback to simple fingerprint
      return btoa(navigator.userAgent + Date.now()).slice(0, 32)
    }
  }

  /**
   * Get or create encryption key for user
   */
  private async getEncryptionKey(userId: string): Promise<EncryptionKey> {
    // Check cache first
    if (this.encryptionKeys.has(userId)) {
      return this.encryptionKeys.get(userId)!
    }

    // Generate new key
    const keyData = await this.generateKey(userId)
    
    // Cache the key
    this.encryptionKeys.set(userId, keyData)
    
    return keyData
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: string, key: EncryptionKey): Promise<string> {
    try {
      const encoded = new TextEncoder().encode(data)
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: key.iv
        },
        key.key,
        encoded
      )

      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(
        key.salt.length + key.iv.length + new Uint8Array(encrypted).length
      )
      combined.set(key.salt, 0)
      combined.set(key.iv, key.salt.length)
      combined.set(new Uint8Array(encrypted), key.salt.length + key.iv.length)

      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      logger.error('Failed to encrypt data', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt data
   */
  private async decrypt(encryptedData: string, userId: string): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.SALT_LENGTH)
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH)
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH)

      // Derive key
      const keyMaterial = await this.importKeyMaterial(userId, salt)
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      )

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        key,
        encrypted.buffer as ArrayBuffer
      )

      return new TextDecoder().decode(decrypted)
    } catch (error) {
      logger.error('Failed to decrypt data', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Check if data is encrypted
   */
  private isEncrypted(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      return parsed.encrypted === true
    } catch {
      return false
    }
  }

  /**
   * Public method to check if data is encrypted (for migration)
   */
  checkIfEncrypted(data: string): boolean {
    return this.isEncrypted(data)
  }

  /**
   * Set encrypted data
   */
  async set(key: string, value: any, userId?: string): Promise<boolean> {
    try {
      if (!userId) {
        // Fallback to regular localStorage for non-sensitive data
        localStorage.setItem(key, JSON.stringify(value))
        return true
      }

      const keyData = await this.getEncryptionKey(userId)
      const serialized = JSON.stringify(value)
      const encrypted = await this.encrypt(serialized, keyData)

      const metadata: StorageMetadata = {
        encrypted: true,
        version: this.VERSION,
        timestamp: Date.now()
      }

      const payload = JSON.stringify({
        metadata,
        data: encrypted
      })

      localStorage.setItem(key, payload)
      return true
    } catch (error) {
      logger.error('Failed to set encrypted data', error, { key })
      return false
    }
  }

  /**
   * Get encrypted data
   */
  async get<T>(key: string, userId?: string, fallback?: T): Promise<T> {
    try {
      const stored = localStorage.getItem(key)
      if (stored === null) return fallback as T

      // Check if data is encrypted
      if (!this.isEncrypted(stored)) {
        // Legacy plaintext data
        return JSON.parse(stored) as T
      }

      if (!userId) {
        logger.warn('Cannot decrypt data without userId', { key })
        return fallback as T
      }

      const payload = JSON.parse(stored)
      const decrypted = await this.decrypt(payload.data, userId)
      return JSON.parse(decrypted) as T
    } catch (error) {
      logger.error('Failed to get encrypted data', error, { key })
      return fallback as T
    }
  }

  /**
   * Remove data
   */
  remove(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      logger.error('Failed to remove data', error, { key })
      return false
    }
  }

  /**
   * Clear all data
   */
  clear(): boolean {
    try {
      localStorage.clear()
      this.encryptionKeys.clear()
      return true
    } catch (error) {
      logger.error('Failed to clear storage', error)
      return false
    }
  }

  /**
   * Migrate existing plaintext data to encrypted
   */
  async migrateData(userId: string, keys: string[]): Promise<void> {
    try {
      logger.info('Starting data migration for encrypted storage')
      
      for (const key of keys) {
        const stored = localStorage.getItem(key)
        if (stored && !this.isEncrypted(stored)) {
          try {
            const data = JSON.parse(stored)
            await this.set(key, data, userId)
            logger.debug('Migrated data to encrypted storage', { key })
          } catch (error) {
            logger.warn('Failed to migrate data', { key, error })
          }
        }
      }
      
      logger.info('Data migration completed')
    } catch (error) {
      logger.error('Data migration failed', error)
    }
  }

  /**
   * Clear cached encryption keys
   */
  clearKeyCache(): void {
    this.encryptionKeys.clear()
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance()

// Export types
export type { EncryptionKey, StorageMetadata }
