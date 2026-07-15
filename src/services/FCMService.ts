import { Capacitor } from '@capacitor/core'
import { getAuth } from 'firebase/auth'

const API_URL = import.meta.env.VITE_BACKEND_API_URL

async function getAuthToken(): Promise<string | null> {
  try {
    return (await getAuth().currentUser?.getIdToken()) ?? null
  } catch {
    return null
  }
}

async function saveTokenToBackend(fcmToken: string): Promise<void> {
  const token = await getAuthToken()
  if (!token) return

  await fetch(`${API_URL}/notifications/register-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fcmToken }),
  })
}

export async function initFCM(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return

    await PushNotifications.addListener('registration', async ({ value: fcmToken }) => {
      await saveTokenToBackend(fcmToken).catch(() => {})
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('FCM registration error:', err)
    })

    await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
      // App is open — OS shows the notification automatically on Android 13+
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (_action) => {
      // User tapped notification — handle deep link here if needed
    })

    // register() dispatches to a native background thread; errors surface via
    // the 'registrationError' listener rather than as a thrown exception.
    // Do NOT await — on emulators without Google Play Services the native call
    // throws IllegalStateException on the CapacitorPlugins thread which would
    // crash the process if it propagates before Firebase finishes initialising.
    PushNotifications.register().catch((err) => {
      console.warn('FCM register() failed (emulator or no Play Services):', err)
    })
  } catch (err) {
    console.warn('FCM init skipped:', err)
  }
}
