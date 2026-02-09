/**
 * Feature flags for future integrations
 */
export const FEATURE_FLAGS = {
  FIREBASE_AUTH: false,
  FIREBASE_STORAGE: false,
  PLAID_INTEGRATION: false,
  PADDLE_BILLING: true,
  PUSH_NOTIFICATIONS: false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}
