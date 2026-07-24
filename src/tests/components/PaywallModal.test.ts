import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PaywallModal from '@/components/ui/PaywallModal.vue'

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

function mountPaywall(props: { show: boolean; message?: string }) {
  return mount(PaywallModal, {
    props,
    global: {
      stubs: {
        Teleport: {
          template: '<div><slot /></div>',
        },
      },
    },
  })
}

describe('PaywallModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    test('does not render when show is false', () => {
      const wrapper = mountPaywall({ show: false })
      expect(wrapper.find('.paywall-modal').exists()).toBe(false)
    })

    test('renders when show is true', () => {
      const wrapper = mountPaywall({ show: true })
      expect(wrapper.find('.paywall-modal').exists()).toBe(true)
    })

    test('displays default message when no message prop provided', () => {
      const wrapper = mountPaywall({ show: true })
      expect(wrapper.text()).toContain('free plan limit')
    })

    test('displays custom message when provided', () => {
      const wrapper = mountPaywall({ show: true, message: 'Custom paywall message' })
      expect(wrapper.text()).toContain('Custom paywall message')
    })

    test('displays Upgrade to Pro title', () => {
      const wrapper = mountPaywall({ show: true })
      expect(wrapper.text()).toContain('Upgrade to 2Subscribe Pro')
    })

    test('renders Upgrade button', () => {
      const wrapper = mountPaywall({ show: true })
      const btn = wrapper.findAll('button').find(b => b.text().includes('Upgrade to Pro'))
      expect(btn).toBeTruthy()
    })

    test('renders Maybe later button', () => {
      const wrapper = mountPaywall({ show: true })
      const btn = wrapper.findAll('button').find(b => b.text().includes('Maybe later'))
      expect(btn).toBeTruthy()
    })
  })

  describe('Actions', () => {
    test('emits close event when Maybe later is clicked', async () => {
      const wrapper = mountPaywall({ show: true })
      const btn = wrapper.findAll('button').find(b => b.text().includes('Maybe later'))
      await btn?.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('emits close event and navigates to subscription page when Upgrade is clicked', async () => {
      const wrapper = mountPaywall({ show: true })
      const btn = wrapper.findAll('button').find(b => b.text().includes('Upgrade to Pro'))
      await btn?.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockRouterPush).toHaveBeenCalledWith('/platform-subscription')
    })
  })
})
