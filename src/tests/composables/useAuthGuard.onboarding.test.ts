import { describe, it, expect, beforeEach, vi } from 'vitest'
import { requireAuth } from '@/composables/useAuthGuard'
import { resetOnboardingCache } from '@/composables/useOnboarding'

// Mock firebase
vi.mock('@/config/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({ currentUser: null })),
  initializeFirebase: vi.fn(),
}))

// Mock bootstrap
vi.mock('@/config/bootstrap', () => ({
  bootstrapApp: vi.fn().mockResolvedValue(undefined),
  isAppBootstrapped: vi.fn().mockReturnValue(true),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Shared mock instances so mutations persist across useAuth()/useAuthStore() calls
const mockAuthInstance = {
  user: { value: null },
  loading: { value: false },
  error: { value: null },
  isAuthenticated: { value: false },
  isSuperAdmin: { value: false },
  userId: { value: null },
  userEmail: { value: undefined },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  initAuthListener: vi.fn(),
  hasPermission: vi.fn(),
  hasAnyPermission: vi.fn(),
  hasAllPermissions: vi.fn(),
}

const mockAuthStoreInstance = {
  user: { value: null },
  loading: { value: false },
  error: { value: null },
  isAuthenticated: { value: false },
  isSuperAdmin: { value: false },
  userId: { value: null },
  userEmail: { value: undefined },
  initAuthListener: vi.fn(),
  waitForInitialAuthCheck: vi.fn().mockResolvedValue(true),
  signIn: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  sendPasswordReset: vi.fn(),
  changeEmail: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
  toggleSuperAdmin: vi.fn(),
}

// Mock auth store to avoid waitForInitialAuthCheck hanging
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStoreInstance,
}))

// Mock useAuth composable
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => mockAuthInstance,
}))

function createMockRoute(path: string) {
  return {
    path,
    fullPath: path,
    name: 'test',
    query: {},
    hash: '',
    params: {},
    meta: {},
    matched: [],
    redirectedFrom: undefined,
  } as any
}

function createNextFn() {
  const calls: any[] = []
  const next = vi.fn((arg?: any) => { calls.push(arg) })
  return { next, calls }
}

describe('useAuthGuard - onboarding integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetOnboardingCache()
    mockAuthInstance.isAuthenticated.value = false
    mockAuthStoreInstance.isAuthenticated.value = false
  })

  function setAuthenticated(authenticated: boolean) {
    mockAuthInstance.isAuthenticated.value = authenticated
    mockAuthStoreInstance.isAuthenticated.value = authenticated
  }

  it('redirects to /onboarding when onboarding is not complete', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
    setAuthenticated(true)

    const { next, calls } = createNextFn()
    await requireAuth(createMockRoute('/'), {} as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(calls[0]).toBe('/onboarding')
  })

  it('does not redirect to /onboarding when already on /onboarding', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
    setAuthenticated(true)

    const { next, calls } = createNextFn()
    await requireAuth(createMockRoute('/onboarding'), {} as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(calls[0]).toBeUndefined()
  })

  it('allows navigation when onboarding is complete', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
    setAuthenticated(true)
    localStorage.setItem('2subscribe_onboarding_complete', 'true')

    const { next, calls } = createNextFn()
    await requireAuth(createMockRoute('/'), {} as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(calls[0]).toBeUndefined()
  })

  it('still redirects to /login when not authenticated', async () => {
    vi.stubEnv('VITE_DATA_BACKEND', 'FIREBASE')
    setAuthenticated(false)

    const { next, calls } = createNextFn()
    await requireAuth(createMockRoute('/'), {} as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(calls[0]).toEqual({
      path: '/login',
      query: { redirect: '/' },
    })
  })
})
