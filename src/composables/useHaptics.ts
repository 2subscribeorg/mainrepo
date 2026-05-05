import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Haptic feedback composable for native mobile haptic feedback
 * Provides different types of haptic feedback for various interactions
 */
export function useHaptics() {
  /**
   * Light impact for subtle feedback (taps, small interactions)
   */
  async function impactLight() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      // Haptics not available on this platform
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Medium impact for standard feedback (button presses, selections)
   */
  async function impactMedium() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Heavy impact for strong feedback (confirmations, important actions)
   */
  async function impactHeavy() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Success notification (completed actions, achievements)
   */
  async function notifySuccess() {
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Warning notification (errors, important alerts)
   */
  async function notifyWarning() {
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Error notification (failures, critical errors)
   */
  async function notifyError() {
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  /**
   * Selection changed feedback (for list selections, tabs)
   */
  async function selectionChanged() {
    try {
      await Haptics.selectionChanged()
    } catch (error) {
      console.debug('Haptics not available:', error)
    }
  }

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notifySuccess,
    notifyWarning,
    notifyError,
    selectionChanged,
  }
}
