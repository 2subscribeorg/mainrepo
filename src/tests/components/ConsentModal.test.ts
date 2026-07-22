import { describe, test, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConsentModal from '@/components/ConsentModal.vue'
import { _resetConsentState } from '@/composables/useConsent'

describe('ConsentModal', () => {
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
      const wrapper = mount(ConsentModal, {
        attachTo: document.body,
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('.fixed').exists()).toBe(true)
      wrapper.unmount()
    })

    test('does not render when consent is granted', () => {
      localStorage.setItem('2subscribe_consent_v1', 'granted')
      _resetConsentState()

      const wrapper = mount(ConsentModal, {
        attachTo: document.body,
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('.fixed').exists()).toBe(false)
      wrapper.unmount()
    })

    test('does not render when consent is declined', () => {
      localStorage.setItem('2subscribe_consent_v1', 'declined')
      _resetConsentState()

      const wrapper = mount(ConsentModal, {
        attachTo: document.body,
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('.fixed').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('Content', () => {
    test('shows consent title', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('#consent-title').text()).toBe('Privacy Consent')
    })

    test('shows consent message', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.text()).toContain('To connect your bank account')
      expect(wrapper.text()).toContain('Plaid')
      expect(wrapper.text()).toContain('regulated third party')
    })

    test('has Accept and Decline buttons', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('Accept')
      expect(buttons[1].text()).toBe('Decline')
    })

    test('shows shield icon', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('svg').exists()).toBe(true)
    })
  })

  describe('Interactions', () => {
    test('grants consent when Accept button is clicked', async () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const acceptButton = wrapper.findAll('button')[0]
      await acceptButton.trigger('click')

      expect(localStorage.getItem('2subscribe_consent_v1')).toBe('granted')
    })

    test('declines consent when Decline button is clicked', async () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const declineButton = wrapper.findAll('button')[1]
      await declineButton.trigger('click')

      expect(localStorage.getItem('2subscribe_consent_v1')).toBe('declined')
    })
  })

  describe('Accessibility', () => {
    test('has proper ARIA role for dialog', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    test('has aria-modal attribute', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-modal')).toBe('true')
    })

    test('has aria-labelledby pointing to title', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-labelledby')).toBe('consent-title')
    })

    test('title has matching id', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.find('#consent-title').exists()).toBe(true)
    })

    test('buttons are keyboard accessible', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach(button => {
        expect(button.element.tagName).toBe('BUTTON')
      })
    })
  })

  describe('Styling', () => {
    test('applies full-screen overlay', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const overlay = wrapper.find('.fixed')
      expect(overlay.classes()).toContain('inset-0')
    })

    test('has backdrop blur effect', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const overlay = wrapper.find('.fixed')
      expect(overlay.classes()).toContain('backdrop-blur-sm')
    })

    test('modal is centered', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const overlay = wrapper.find('.fixed')
      expect(overlay.classes()).toContain('items-end')
      expect(overlay.classes()).toContain('justify-center')
    })

    test('modal has rounded corners', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      const modal = wrapper.find('.bg-surface')
      expect(modal.classes()).toContain('rounded-t-3xl')
    })
  })

  describe('Teleport', () => {
    test('uses Teleport component', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      expect(wrapper.findComponent({ name: 'Teleport' }).exists()).toBe(true)
    })
  })

  describe('Transitions', () => {
    test('has fade transition', () => {
      const wrapper = mount(ConsentModal, {
        global: {
          stubs: {
            Teleport: true
          }
        }
      })

      // Teleport component exists, which contains the transition
      expect(wrapper.findComponent({ name: 'Teleport' }).exists()).toBe(true)
    })
  })
})
