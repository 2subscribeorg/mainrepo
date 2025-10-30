import type { BudgetConfig, BudgetStatus } from '@/domain/models'

export interface IBudgetsRepo {
  get(): Promise<BudgetConfig>
  set(cfg: BudgetConfig): Promise<void>
  evaluate(monthISO: string): Promise<BudgetStatus>
}
