import { z } from 'zod'

/**
 * Zod schemas for Plaid API input validation
 * Provides runtime type checking and sanitization for all Plaid-related data
 */

export const UserIdSchema = z.string()
  .min(1, 'User ID is required')
  .max(128, 'User ID is too long')
  .trim()
  .refine((val) => val.length > 0, 'User ID cannot be empty after trimming')

export const PublicTokenSchema = z.string()
  .min(10, 'Public token is too short')
  .max(500, 'Public token is too long')
  .trim()
  .refine((val) => val.length >= 10, 'Public token must be at least 10 characters')

export const ConnectionIdSchema = z.string()
  .min(1, 'Connection ID is required')
  .max(128, 'Connection ID is too long')
  .trim()
  .refine((val) => val.length > 0, 'Connection ID cannot be empty after trimming')

export const LinkTokenResponseSchema = z.object({
  linkToken: z.string().min(1, 'Link token is required')
})

export const ExchangeTokenResponseSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required')
})

export const SyncTransactionsResponseSchema = z.object({
  transactionCount: z.number().int().nonnegative()
})

/**
 * Validation error class for Plaid input validation failures
 */
export class PlaidValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'PlaidValidationError'
  }
}

/**
 * Validates and sanitizes a user ID
 * @throws {PlaidValidationError} if validation fails
 */
export function validateUserId(userId: string): string {
  try {
    return UserIdSchema.parse(userId)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid user ID', 'userId')
    }
    throw new PlaidValidationError('Invalid user ID', 'userId')
  }
}

/**
 * Validates and sanitizes a public token
 * @throws {PlaidValidationError} if validation fails
 */
export function validatePublicToken(token: string): string {
  try {
    return PublicTokenSchema.parse(token)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid public token', 'publicToken')
    }
    throw new PlaidValidationError('Invalid public token', 'publicToken')
  }
}

/**
 * Validates and sanitizes a connection ID
 * @throws {PlaidValidationError} if validation fails
 */
export function validateConnectionId(connectionId: string): string {
  try {
    return ConnectionIdSchema.parse(connectionId)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid connection ID', 'connectionId')
    }
    throw new PlaidValidationError('Invalid connection ID', 'connectionId')
  }
}

/**
 * Validates link token response from backend
 * @throws {PlaidValidationError} if validation fails
 */
export function validateLinkTokenResponse(data: unknown): { linkToken: string } {
  try {
    return LinkTokenResponseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid link token response', 'linkToken')
    }
    throw new PlaidValidationError('Invalid link token response')
  }
}

/**
 * Validates exchange token response from backend
 * @throws {PlaidValidationError} if validation fails
 */
export function validateExchangeTokenResponse(data: unknown): { itemId: string } {
  try {
    return ExchangeTokenResponseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid exchange token response', 'itemId')
    }
    throw new PlaidValidationError('Invalid exchange token response')
  }
}

/**
 * Validates sync transactions response from backend
 * @throws {PlaidValidationError} if validation fails
 */
export function validateSyncTransactionsResponse(data: unknown): { transactionCount: number } {
  try {
    return SyncTransactionsResponseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new PlaidValidationError(firstError?.message || 'Invalid sync transactions response', 'transactionCount')
    }
    throw new PlaidValidationError('Invalid sync transactions response')
  }
}
