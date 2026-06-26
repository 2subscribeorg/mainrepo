/**
 * Wraps fetch() and handles account-deactivated / token-revoked responses globally.
 * ACCOUNT_DEACTIVATED (403) and TOKEN_REVOKED (401) both sign the user out and
 * redirect to /login with the appropriate reason query param.
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options)

  if (response.status === 403 || response.status === 401) {
    let body: { code?: string; message?: string } = {}
    try {
      body = await response.clone().json()
    } catch {
      // non-JSON response — fall through to normal handling
    }

    const isDeactivated =
      body.code === 'ACCOUNT_DEACTIVATED' ||
      body.message?.toLowerCase().includes('deactivated')

    const isRevoked = body.code === 'TOKEN_REVOKED'

    if (isDeactivated || isRevoked) {
      const { useAuthStore } = await import('@/stores/auth')
      const { default: router } = await import('@/router')
      const auth = useAuthStore()
      await auth.logout()
      await router.push({ path: '/login', query: { reason: 'deactivated' } })
    }
  }

  return response
}
