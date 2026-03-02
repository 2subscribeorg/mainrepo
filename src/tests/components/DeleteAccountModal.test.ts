import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mountModal } from '@/tests/helpers/modalTestUtils'
import DeleteAccountModal from '@/components/settings/DeleteAccountModal.vue'

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to mount modal with props
  const createWrapper = (props: any) => {
    return mountModal(DeleteAccountModal, props)
  }

  describe('Rendering', () => {
    test('shows modal when isOpen is true', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const modal = wrapper.find('[role="dialog"]')
      expect(modal.exists()).toBe(true)
    })

    test('hides modal when isOpen is false', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: false,
        },
      })

      // Assert
      const modal = wrapper.find('[role="dialog"]')
      expect(modal.exists()).toBe(false)
    })

    test('displays warning icon', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const icon = wrapper.find('.bg-error-bg')
      expect(icon.exists()).toBe(true)
    })

    test('displays title', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Delete Account?')
    })

    test('displays warning message', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('This action cannot be undone')
    })

    test('displays list of items to be deleted', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('All your subscriptions')
      expect(wrapper.text()).toContain('All your transactions')
      expect(wrapper.text()).toContain('All your categories')
      expect(wrapper.text()).toContain('All your bank connections')
      expect(wrapper.text()).toContain('Your account settings and preferences')
    })

    test('displays password input field', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const passwordInput = wrapper.find('#delete-password')
      expect(passwordInput.exists()).toBe(true)
      expect(passwordInput.attributes('type')).toBe('password')
    })

    test('displays confirmation text input', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const confirmInput = wrapper.find('#confirm-delete')
      expect(confirmInput.exists()).toBe(true)
      expect(confirmInput.attributes('type')).toBe('text')
    })
  })

  describe('Confirmation Flow', () => {
    test('Delete button is disabled when password is empty', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(true)
    })

    test('Delete button is disabled when confirmation text is incorrect', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('WRONG')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(true)
    })

    test('Delete button is enabled when both password and "DELETE" are entered', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(false)
    })

    test('emits confirm event with password when Delete button clicked', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      await deleteButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
      expect(wrapper.emitted('confirm')?.[0]).toEqual(['mypassword'])
    })

    test('emits confirm event when Enter pressed in password field', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      await passwordInput.trigger('keydown.enter')

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
    })

    test('emits confirm event when Enter pressed in confirmation field', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      await confirmInput.trigger('keydown.enter')

      // Assert
      expect(wrapper.emitted('confirm')).toBeTruthy()
    })
  })

  describe('Cancel Flow', () => {
    test('emits cancel event when Cancel button clicked', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(b => b.text() === 'Cancel')
      await cancelButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    test('emits cancel event when backdrop clicked', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const backdrop = wrapper.find('.fixed.inset-0')
      await backdrop.trigger('click')

      // Assert
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    test('emits cancel event when Escape key pressed', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const modal = wrapper.find('[role="dialog"]')
      await modal.trigger('keydown.esc')

      // Assert
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    test('clears inputs when cancel is triggered', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(b => b.text() === 'Cancel')
      await cancelButton?.trigger('click')

      // Assert
      expect((passwordInput.element as HTMLInputElement).value).toBe('')
      expect((confirmInput.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('Deleting State', () => {
    test('shows "Deleting..." when isDeleting is true', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
          isDeleting: true,
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Deleting...')
    })

    test('disables Delete button when isDeleting is true', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
          isDeleting: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Deleting'))
      expect(deleteButton?.element.disabled).toBe(true)
    })

    test('prevents cancel when isDeleting is true', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
          isDeleting: true,
        },
      })

      // Act
      const buttons = wrapper.findAll('button')
      const cancelButton = buttons.find(b => b.text() === 'Cancel')
      await cancelButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    test('prevents confirm when isDeleting is true', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
          isDeleting: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Deleting'))
      await deleteButton?.trigger('click')

      // Assert
      expect(wrapper.emitted('confirm')).toBeFalsy()
    })
  })

  describe('Error Handling', () => {
    test('displays error message when provided', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
          errorMessage: 'Invalid password',
        },
      })

      // Assert
      expect(wrapper.text()).toContain('Invalid password')
      const errorText = wrapper.find('.text-error-text')
      expect(errorText.exists()).toBe(true)
    })

    test('hides error message when not provided', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert - Check that error message paragraph with v-if doesn't exist
      // The component has other text-error-text elements (warning message, DELETE span)
      // so we check that errorMessage prop text is not in the wrapper
      expect(wrapper.text()).not.toContain('Invalid password')
      expect(wrapper.text()).not.toContain('Error')
    })
  })

  describe('Accessibility', () => {
    test('has proper dialog role', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')
    })

    test('has aria-labelledby pointing to title', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.attributes('aria-labelledby')).toBe('delete-account-title')
      const title = wrapper.find('#delete-account-title')
      expect(title.exists()).toBe(true)
    })

    test('password input has proper label', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const passwordInput = wrapper.find('#delete-password')
      expect(passwordInput.exists()).toBe(true)
      expect(wrapper.text()).toContain('Enter your password to confirm')
    })

    test('confirmation input has proper label', () => {
      // Arrange & Act
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Assert
      const confirmInput = wrapper.find('#confirm-delete')
      expect(confirmInput.exists()).toBe(true)
      expect(wrapper.text()).toContain('Type DELETE to confirm')
    })
  })

  describe('Edge Cases', () => {
    test('handles whitespace in confirmation text', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('  DELETE  ')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(false)
    })

    test('handles whitespace in password', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('  ')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(true)
    })

    test('confirmation is case-sensitive', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      const passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      const confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('delete')

      // Assert
      const buttons = wrapper.findAll('button')
      const deleteButton = buttons.find(b => b.text().includes('Delete Account'))
      expect(deleteButton?.element.disabled).toBe(true)
    })

    test('clears inputs when modal is closed and reopened', async () => {
      // Arrange
      const wrapper = createWrapper({
        props: {
          isOpen: true,
        },
      })

      // Act
      let passwordInput = wrapper.find('#delete-password')
      await passwordInput.setValue('mypassword')
      let confirmInput = wrapper.find('#confirm-delete')
      await confirmInput.setValue('DELETE')
      
      await wrapper.setProps({ isOpen: false })
      await wrapper.setProps({ isOpen: true })

      // Re-query inputs after modal reopens
      passwordInput = wrapper.find('#delete-password')
      confirmInput = wrapper.find('#confirm-delete')

      // Assert
      expect((passwordInput.element as HTMLInputElement).value).toBe('')
      expect((confirmInput.element as HTMLInputElement).value).toBe('')
    })
  })
})
