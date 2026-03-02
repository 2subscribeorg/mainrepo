import type { BankTransaction } from '@/domain/models'

/**
 * Clusters transactions by similar amounts with configurable tolerance
 * Used to group transactions that may have slight price variations
 */
export class AmountClusterer {
  constructor(private tolerancePercent: number = 15) {}

  /**
   * Cluster transactions by similar amounts with tolerance
   * Transactions are grouped if their amounts are within the tolerance percentage
   */
  clusterByAmount(transactions: BankTransaction[]): BankTransaction[][] {
    const clusters: BankTransaction[][] = []
    const tolerance = this.tolerancePercent / 100
    
    for (const tx of transactions) {
      const amount = Math.abs(tx.amount.amount)
      let matched = false
      
      // Try to add to existing cluster
      for (const cluster of clusters) {
        const clusterAmounts = cluster.map(t => Math.abs(t.amount.amount))
        const clusterAvg = clusterAmounts.reduce((sum, a) => sum + a, 0) / clusterAmounts.length
        const diff = Math.abs(amount - clusterAvg) / clusterAvg
        
        if (diff <= tolerance) {
          cluster.push(tx)
          matched = true
          break
        }
      }
      
      // Create new cluster if no match
      if (!matched) {
        clusters.push([tx])
      }
    }
    
    return clusters
  }
}
