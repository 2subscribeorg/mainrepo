import { mount, type VueWrapper } from '@vue/test-utils'

/**
 * Mount a modal component with proper Teleport stubbing
 * 
 * This helper ensures consistent Teleport stubbing across all modal tests
 * to prevent z-index layering issues and DOM structure mismatches between
 * test and production environments.
 * 
 * @param component - The modal component to mount
 * @param options - Vue Test Utils mount options
 * @returns VueWrapper instance
 * 
 * @example
 * ```typescript
 * import { mountModal } from '@/tests/helpers/modalTestUtils'
 * import MyModal from '@/components/MyModal.vue'
 * 
 * const wrapper = mountModal(MyModal, {
 *   props: { isOpen: true },
 *   global: {
 *     stubs: {
 *       ChildComponent: true
 *     }
 *   }
 * })
 * ```
 */
export function mountModal(component: any, options: any = {}): VueWrapper {
  return mount(component, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        // Always stub Teleport for modal components
        Teleport: true,
        // Preserve any additional stubs from options
        ...options.global?.stubs
      }
    }
  })
}
