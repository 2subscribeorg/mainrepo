import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TwoFactorSettings from '@/components/settings/TwoFactorSettings.vue'

const mocks = vi.hoisted(() => ({
  recaptchaVerifier: { clear: vi.fn() },
  createRecaptchaVerifier: vi.fn(),
  reauthenticate: vi.fn(),
  sendMfaEnrollmentCode: vi.fn(),
  completeMfaEnrollment: vi.fn(),
  unenrollMfa: vi.fn(),
  getMfaEnrolledFactors: vi.fn(),
}))

vi.mock('@/config/firebase', () => ({
  createRecaptchaVerifier: mocks.createRecaptchaVerifier,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    reauthenticate: mocks.reauthenticate,
    sendMfaEnrollmentCode: mocks.sendMfaEnrollmentCode,
    completeMfaEnrollment: mocks.completeMfaEnrollment,
    unenrollMfa: mocks.unenrollMfa,
    getMfaEnrolledFactors: mocks.getMfaEnrolledFactors,
  }),
}))

describe('TwoFactorSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createRecaptchaVerifier.mockReturnValue(mocks.recaptchaVerifier)
    mocks.reauthenticate.mockResolvedValue({ success: true, message: 'ok' })
    mocks.sendMfaEnrollmentCode.mockResolvedValue({ success: true, error: null })
    mocks.completeMfaEnrollment.mockResolvedValue({ success: true, error: null })
    mocks.unenrollMfa.mockResolvedValue({ success: true, error: null })
    mocks.getMfaEnrolledFactors.mockReturnValue([])
  })

  test('requires a valid E.164 phone number before reauthenticating', async () => {
    const wrapper = mount(TwoFactorSettings)

    await wrapper.find('#enroll-password').setValue('Current123')
    await wrapper.find('#phone').setValue('+919103888488')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Enter a valid phone number with country code')
    expect(mocks.reauthenticate).not.toHaveBeenCalled()
    expect(mocks.sendMfaEnrollmentCode).not.toHaveBeenCalled()
  })

  test('reauthenticates before sending an enrollment code', async () => {
    const wrapper = mount(TwoFactorSettings)

    await wrapper.find('#enroll-password').setValue('Current123')
    await wrapper.find('#phone').setValue('+919103888488')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.reauthenticate).toHaveBeenCalledWith('Current123')
    expect(mocks.createRecaptchaVerifier).toHaveBeenCalled()
    expect(mocks.sendMfaEnrollmentCode).toHaveBeenCalledWith('+919103888488', mocks.recaptchaVerifier)
    expect(mocks.reauthenticate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendMfaEnrollmentCode.mock.invocationCallOrder[0],
    )
    expect(wrapper.find('#enroll-otp').exists()).toBe(true)
  })

  test('reauthenticates before disabling MFA', async () => {
    mocks.getMfaEnrolledFactors.mockReturnValue([{ phoneNumber: '+919103888488' }])
    const wrapper = mount(TwoFactorSettings)

    await wrapper.find('#disable-password').setValue('Current123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.reauthenticate).toHaveBeenCalledWith('Current123')
    expect(mocks.unenrollMfa).toHaveBeenCalled()
    expect(mocks.reauthenticate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.unenrollMfa.mock.invocationCallOrder[0],
    )
  })
})