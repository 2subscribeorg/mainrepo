import type { ID, BankConnection, BankAccount } from '@/domain/models'

export interface IBankAccountsRepo {
  // List all bank connections for current user
  listConnections(): Promise<BankConnection[]>
  
  // Get a specific connection
  getConnection(id: ID): Promise<BankConnection | null>
  
  // Connect a new bank account (returns link token for UI)
  initializeConnection(): Promise<{ linkToken: string }>
  
  // Complete connection after user authenticates
  completeConnection(publicToken: string): Promise<BankConnection>
  
  // Disconnect a bank connection
  disconnect(connectionId: ID): Promise<void>
  
  // Sync transactions for a connection
  syncTransactions(connectionId: ID): Promise<void>
  
  // Get all accounts across all connections
  listAccounts(): Promise<BankAccount[]>
}
