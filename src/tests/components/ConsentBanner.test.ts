import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConsentBanner from '@/components/ConsentBanner.vue'
import { _resetConsentState } from '@/composables/useConsent'

describe('ConsentBanner', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    try {
      localStorage.removeItem('2subscribe_consent_v1')
    } catch {
      // localStorage may be unavailable in some test environments
    }
    // Reset the global state to re-read from localStorage
    _resetConsentState()
  })

  describe('Visibility', () => {
    test('renders when consent is undecided', () => {
      const wrapper = mount(ConsentBanner)

      expect(wrapper.find('.fixed').exists()).toBe(true)
    })

    test('does not render when consent is granted', () => {
      localStorage.setItem('2subscribe_consent_v1', 'granted')
      _resetConsentState()

      const wrapper = mount(ConsentBanner)

      expect(wrapper.find('.fixed').exists()).toBe(false)
    })

    test('does not render when consent is declined', () => {
      localStorage.setItem('2subscribe_consent_v1', 'declined')
      _resetConsentState()

      const wrapper = mount(ConsentBanner)

      expect(wrapper.find('.fixed').exists()).toBe(false)
    })
  })

  describe('Content', () => {
    test('shows consent message', () => {
      const wrapper = mount(ConsentBanner)

      expect(wrapper.text()).toContain('To connect your bank account')
      expect(wrapper.text()).toContain('Plaid')
      expect(wrapper.text()).toContain('regulated third party')
    })

    test('has Accept and Decline buttons', () => {
      const wrapper = mount(ConsentBanner)

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('Decline')
      expect(buttons[1].text()).toBe('Accept')
    })
  })

  describe('Interactions', () => {
    test('grants consent when Accept button is clicked', async () => {
      const wrapper = mount(ConsentBanner)

      const acceptButton = wrapper.findAll('button')[1]
      await acceptButton.trigger('click')

      expect(localStorage.getItem('2subscribe_consent_v1')).toBe('granted')
    })

    test('declines consent when Decline button is clicked', async () => {
      const wrapper = mount(ConsentBanner)

      const declineButton = wrapper.findAll('button')[0]
      await declineButton.trigger('click')

      expect(localStorage.getItem('2subscribe_consent_v1')).toBe('declined')
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA role for alert', () => {
      const wrapper = mount(ConsentBanner)

      expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    })

    test('has aria-live attribute for screen readers', () => {
      const wrapper = mount(ConsentBanner)

      const alert = wrapper.find('[role="alert"]')
      expect(alert.attributes('aria-live')).toBe('polite')
    })

    test('buttons are keyboard accessible', () => {
      const wrapper = mount(ConsentBanner)

      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Styling', () => {
    test('applies fixed positioning at bottom', () => {
      const wrapper = mount(ConsentBanner)

      const banner = wrapper.find('.fixed')
      expect(banner.classes()).toContain('bottom-0')
      expect(banner.classes()).toContain('left-0')
      expect(banner.classes()).toContain('right-0')
    })

    test('has backdrop blur effect', () => {
      const wrapper = mount(ConsentBanner)

      const banner = wrapper.find('.fixed')
      expect(banner.classes()).toContain('backdrop-blur-md')
    })
  })
})
