import { Capacitor } from '@capacitor/core'

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'

function vibratePattern(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

const patterns: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 50,
  selection: 5,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [40, 30, 40, 30, 40],
}

export function useHaptics() {
  async function impact(style: HapticStyle = 'light') {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        const styleMap: Record<string, typeof ImpactStyle.Light | typeof ImpactStyle.Medium | typeof ImpactStyle.Heavy> = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        }
        if (style in styleMap) {
          await Haptics.impact({ style: styleMap[style] })
          return
        }
      } catch { /* fallback to vibrate */ }
    }
    vibratePattern(patterns[style])
  }

  async function notification(type: 'success' | 'warning' | 'error') {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics')
        const typeMap: Record<string, typeof NotificationType.Success | typeof NotificationType.Warning | typeof NotificationType.Error> = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        }
        await Haptics.notification({ type: typeMap[type] })
        return
      } catch { /* fallback to vibrate */ }
    }
    vibratePattern(patterns[type])
  }

  async function selection() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics } = await import('@capacitor/haptics')
        await Haptics.selectionStart()
        return
      } catch { /* fallback to vibrate */ }
    }
    vibratePattern(patterns.selection)
  }

  return { impact, notification, selection }
}
