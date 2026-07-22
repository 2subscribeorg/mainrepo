import type { BankTransaction, Recurrence } from '@/domain/models'

export interface RecurrenceAnalysis {
  frequency: Recurrence
  confidence: number
  averageIntervalDays: number
  isReliable: boolean
}

const RECURRENCE_WINDOWS: Array<{
  frequency: Recurrence
  target: number
  tolerance: number
}> = [
  { frequency: 'weekly', target: 7, tolerance: 2 },
  { frequency: 'biweekly', target: 14, tolerance: 3 },
  { frequency: 'monthly', target: 30, tolerance: 5 },
  { frequency: 'quarterly', target: 90, tolerance: 10 },
  { frequency: 'yearly', target: 365, tolerance: 20 },
]

const RELIABLE_CONFIDENCE_THRESHOLD = 0.7

export class RecurrenceAnalyzer {
  analyze(transactions: BankTransaction[]): RecurrenceAnalysis {
    if (transactions.length < 2) {
      return {
        frequency: 'monthly',
        confidence: 0,
        averageIntervalDays: 0,
        isReliable: false,
      }
    }

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) /
        (1000 * 60 * 60 * 24)
      gaps.push(diff)
    }

    const avgInterval = gaps.reduce((sum, g) => sum + g, 0) / gaps.length

    let bestMatch: {
      frequency: Recurrence
      confidence: number
    } | null = null

    for (const window of RECURRENCE_WINDOWS) {
      const diff = Math.abs(avgInterval - window.target)
      if (diff <= window.tolerance) {
        const confidence = 1 - diff / window.tolerance
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { frequency: window.frequency, confidence }
        }
      }
    }

    if (!bestMatch) {
      return {
        frequency: 'monthly',
        confidence: 0,
        averageIntervalDays: avgInterval,
        isReliable: false,
      }
    }

    const intervalVariance = this.calculateVariance(gaps, avgInterval)
    const varianceRatio = avgInterval > 0 ? intervalVariance / avgInterval : 0
    const consistencyScore = Math.max(0, 1 - varianceRatio)

    const finalConfidence = bestMatch.confidence * 0.6 + consistencyScore * 0.4
    const isReliable = finalConfidence >= RELIABLE_CONFIDENCE_THRESHOLD

    return {
      frequency: isReliable ? bestMatch.frequency : 'monthly',
      confidence: finalConfidence,
      averageIntervalDays: avgInterval,
      isReliable,
    }
  }

  private calculateVariance(values: number[], avg: number): number {
    if (values.length === 0) return 0
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
  }
}
