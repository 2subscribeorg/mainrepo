/**
 * Password validation utilities
 * Provides modular, reusable password strength checking
 */

export interface PasswordRequirement {
  id: string
  label: string
  test: (password: string) => boolean
  errorMessage: string
}

export interface PasswordStrength {
  score: number // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong'
  percentage: number // 0-100
  passedRequirements: string[]
  failedRequirements: string[]
}

/**
 * Password requirements configuration
 * Modular and easy to customize
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'minLength',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
    errorMessage: 'Password must be at least 8 characters'
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
    errorMessage: 'Password must contain at least one uppercase letter'
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
    errorMessage: 'Password must contain at least one lowercase letter'
  },
  {
    id: 'number',
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
    errorMessage: 'Password must contain at least one number'
  },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*)',
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    errorMessage: 'Password must contain at least one special character'
  }
]

/**
 * Validate password against all requirements
 * Returns array of error messages for failed requirements
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = []
  
  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (!requirement.test(password)) {
      errors.push(requirement.errorMessage)
    }
  }
  
  return errors
}

/**
 * Check if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0
}

/**
 * Calculate password strength score
 * Returns detailed strength information
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const passedRequirements: string[] = []
  const failedRequirements: string[] = []
  
  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (requirement.test(password)) {
      passedRequirements.push(requirement.id)
    } else {
      failedRequirements.push(requirement.id)
    }
  }
  
  const score = passedRequirements.length
  const percentage = Math.round((score / PASSWORD_REQUIREMENTS.length) * 100)
  
  let label: PasswordStrength['label']
  if (score === 0) {
    label = 'Very Weak'
  } else if (score === 1) {
    label = 'Weak'
  } else if (score === 2 || score === 3) {
    label = 'Fair'
  } else if (score === 4) {
    label = 'Strong'
  } else {
    label = 'Very Strong'
  }
  
  return {
    score,
    label,
    percentage,
    passedRequirements,
    failedRequirements
  }
}

/**
 * Get color for password strength indicator
 */
export function getPasswordStrengthColor(strength: PasswordStrength): string {
  if (strength.score === 0) return 'bg-error'
  if (strength.score === 1) return 'bg-error'
  if (strength.score === 2) return 'bg-warning'
  if (strength.score === 3) return 'bg-warning'
  if (strength.score === 4) return 'bg-info'
  return 'bg-success'
}

/**
 * Common weak passwords to reject
 * Can be extended with more patterns
 */
export const COMMON_WEAK_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'monkey',
  '1234567890',
  'password1'
]

/**
 * Check if password is in common weak passwords list
 */
export function isCommonWeakPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase()
  return COMMON_WEAK_PASSWORDS.some(weak => lowerPassword.includes(weak))
}
