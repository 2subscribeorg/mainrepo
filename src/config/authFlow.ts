export function isEmailVerificationRequired(): boolean {
  if (import.meta.env.VITE_DATA_BACKEND !== 'FIREBASE') {
    return false
  }

  return import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true'
}
