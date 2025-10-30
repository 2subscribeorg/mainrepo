import type { Money, Currency } from '@/domain/models'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
}

export function formatMoney(money: Money, includeSymbol = true): string {
  const symbol = includeSymbol ? CURRENCY_SYMBOLS[money.currency] : ''
  return `${symbol}${money.amount.toFixed(2)}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0 && days <= 7) return `In ${days} days`
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`

  return formatDate(dateStr)
}

export function formatRecurrence(recurrence: string): string {
  return recurrence.charAt(0).toUpperCase() + recurrence.slice(1)
}

export function getCurrentMonthISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthName(monthISO: string): string {
  const [year, month] = monthISO.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)
}
