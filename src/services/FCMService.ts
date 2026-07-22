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
      await saveTokenToBackend(fcmToken)
    })

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error:', err)
    })

    await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
      // App is open — OS shows the notification automatically on Android 13+
    })

    await PushNotifications.addListener('pushNotificationActionPerformed', (_action) => {
      // User tapped notification — handle deep link here if needed
    })

    await PushNotifications.register()
  } catch (err) {
    console.error('FCM init error:', err)
  }
}
