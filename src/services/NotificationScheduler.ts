import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'
import type { Subscription, BankConnection } from '@/domain/models'

function hashId(prefix: string, id: string): number {
  let hash = 0
  const str = prefix + id
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 1_000_000_000
}

function fireDate(isoDate: string, daysBefore: number): Date | null {
  const target = new Date(isoDate)
  if (isNaN(target.getTime())) return null
  target.setDate(target.getDate() - daysBefore)
  target.setHours(9, 0, 0, 0)
  if (target <= new Date()) return null
  return target
}

function currencySymbol(currency: string): string {
  if (currency === 'GBP') return '£'
  if (currency === 'EUR') return '€'
  return '$'
}

class NotificationSchedulerService {
  private get isAvailable(): boolean {
    return Capacitor.isNativePlatform()
  }

  async requestPermission(): Promise<void> {
    if (!this.isAvailable) return
    try {
      await LocalNotifications.requestPermissions()
    } catch {}
  }

  async scheduleRenewalReminder(sub: Subscription): Promise<void> {
    if (!this.isAvailable || sub.status !== 'active') return
    const at = fireDate(sub.nextPaymentDate, 3)
    if (!at) return

    const symbol = currencySymbol(sub.amount.currency)
    const dateStr = new Date(sub.nextPaymentDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })

    try {
      await LocalNotifications.cancel({ notifications: [{ id: hashId('sub', sub.id) }] })
      await LocalNotifications.schedule({
        notifications: [{
          id: hashId('sub', sub.id),
          title: `${sub.merchantName} renews in 3 days`,
          body: `${symbol}${sub.amount.amount.toFixed(2)} due on ${dateStr}`,
          schedule: { at },
        }],
      })
    } catch {}
  }

  async cancelRenewalReminder(subscriptionId: string): Promise<void> {
    if (!this.isAvailable) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: hashId('sub', subscriptionId) }] })
    } catch {}
  }

  async scheduleBankExpiryWarning(connection: BankConnection): Promise<void> {
    if (!this.isAvailable || !connection.expiresAt || connection.status === 'disconnected') return
    const at = fireDate(connection.expiresAt, 7)
    if (!at) return

    try {
      await LocalNotifications.cancel({ notifications: [{ id: hashId('bank', connection.id) }] })
      await LocalNotifications.schedule({
        notifications: [{
          id: hashId('bank', connection.id),
          title: 'Bank connection expiring soon',
          body: `Your ${connection.institutionName} connection expires in 7 days. Tap to reconnect.`,
          schedule: { at },
        }],
      })
    } catch {}
  }

  async cancelBankExpiryWarning(connectionId: string): Promise<void> {
    if (!this.isAvailable) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: hashId('bank', connectionId) }] })
    } catch {}
  }

  async rescheduleAll(subscriptions: Subscription[], connections: BankConnection[]): Promise<void> {
    if (!this.isAvailable) return
    try {
      const { notifications: pending } = await LocalNotifications.getPending()
      if (pending.length > 0) {
        await LocalNotifications.cancel({ notifications: pending })
      }
    } catch {}

    await Promise.all([
      ...subscriptions
        .filter(s => s.status === 'active')
        .map(s => this.scheduleRenewalReminder(s)),
      ...connections
        .filter(c => c.status !== 'disconnected' && !!c.expiresAt)
        .map(c => this.scheduleBankExpiryWarning(c)),
    ])
  }
}

export const notificationScheduler = new NotificationSchedulerService()
