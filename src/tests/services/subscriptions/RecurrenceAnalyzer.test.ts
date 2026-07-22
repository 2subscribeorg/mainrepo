import { describe, it, expect } from 'vitest'
import { RecurrenceAnalyzer } from '@/services/subscriptions/RecurrenceAnalyzer'
import type { BankTransaction } from '@/domain/models'

describe('RecurrenceAnalyzer', () => {
  const analyzer = new RecurrenceAnalyzer()

  const createTransaction = (
    date: string,
    id: string = 'tx-1'
  ): BankTransaction => ({
    id,
    accountId: 'acc-1',
    amount: { amount: 9.99, currency: 'GBP' },
    merchantName: 'Netflix',
    date,
    category: ['Entertainment'],
    pending: false,
    transactionType: 'purchase',
    userId: 'user-1',
    createdAt: '2024-01-01'
  })

  it('detects weekly recurrence from 7-day gaps', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-01-08', 'tx-2'),
      createTransaction('2024-01-15', 'tx-3'),
      createTransaction('2024-01-22', 'tx-4'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('weekly')
    expect(result.isReliable).toBe(true)
    expect(result.averageIntervalDays).toBeCloseTo(7, 1)
  })

  it('detects biweekly recurrence from 14-day gaps', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-01-15', 'tx-2'),
      createTransaction('2024-01-29', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('biweekly')
    expect(result.isReliable).toBe(true)
    expect(result.averageIntervalDays).toBeCloseTo(14, 1)
  })

  it('detects monthly recurrence from 30-day gaps', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-01-31', 'tx-2'),
      createTransaction('2024-03-01', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('monthly')
    expect(result.isReliable).toBe(true)
    expect(result.averageIntervalDays).toBeCloseTo(30, 1)
  })

  it('detects quarterly recurrence from ~90-day gaps', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-04-01', 'tx-2'),
      createTransaction('2024-07-01', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('quarterly')
    expect(result.isReliable).toBe(true)
    expect(result.averageIntervalDays).toBeCloseTo(91, 0)
  })

  it('detects yearly recurrence from ~365-day gaps', () => {
    const transactions = [
      createTransaction('2023-01-01', 'tx-1'),
      createTransaction('2024-01-01', 'tx-2'),
      createTransaction('2025-01-01', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('yearly')
    expect(result.isReliable).toBe(true)
    expect(result.averageIntervalDays).toBeCloseTo(365.5, 0)
  })

  it('falls back to monthly for noisy/ambiguous intervals', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-01-20', 'tx-2'),
      createTransaction('2024-03-15', 'tx-3'),
      createTransaction('2024-04-02', 'tx-4'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('monthly')
    expect(result.isReliable).toBe(false)
  })

  it('falls back to monthly with fewer than 2 transactions', () => {
    const transactions = [createTransaction('2024-01-01', 'tx-1')]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('monthly')
    expect(result.isReliable).toBe(false)
    expect(result.confidence).toBe(0)
  })

  it('falls back to monthly for intervals that do not match any window', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-02-15', 'tx-2'),
      createTransaction('2024-04-01', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('monthly')
    expect(result.isReliable).toBe(false)
  })

  it('handles monthly intervals with 28-day gaps (Feb)', () => {
    const transactions = [
      createTransaction('2024-01-01', 'tx-1'),
      createTransaction('2024-01-29', 'tx-2'),
      createTransaction('2024-02-26', 'tx-3'),
    ]

    const result = analyzer.analyze(transactions)

    expect(result.frequency).toBe('monthly')
    expect(result.isReliable).toBe(true)
  })
})
