import type { ID, BankConnection, BankAccount } from '@/domain/models'
import type { IBankAccountsRepo } from '../interfaces/IBankAccountsRepo'

export class MockBankAccountsRepo implements IBankAccountsRepo {
  private connections: BankConnection[] = []
  
  async listConnections(): Promise<BankConnection[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return [...this.connections]
  }
  
  async getConnection(id: ID): Promise<BankConnection | null> {
    await new Promise(resolve => setTimeout(resolve, 200))
    return this.connections.find(c => c.id === id) || null
  }
  
  async initializeConnection(): Promise<{ linkToken: string }> {
    // Simulate getting a link token
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      linkToken: 'mock-link-token-' + crypto.randomUUID()
    }
  }
  
  async completeConnection(publicToken: string): Promise<BankConnection> {
    // Simulate exchanging public token for connection
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Generate mock bank connection
    const connectionId = crypto.randomUUID()
    const mockBanks = [
      { id: 'barclays', name: 'Barclays' },
      { id: 'hsbc', name: 'HSBC UK' },
      { id: 'lloyds', name: 'Lloyds Bank' },
      { id: 'natwest', name: 'NatWest' },
      { id: 'santander', name: 'Santander UK' },
    ]
    
    const randomBank = mockBanks[Math.floor(Math.random() * mockBanks.length)]
    
    const mockAccounts: BankAccount[] = [
      {
        id: crypto.randomUUID(),
        institutionId: randomBank.id,
        institutionName: randomBank.name,
        accountName: 'Current Account',
        accountType: 'checking',
        mask: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
        currency: 'GBP',
        balance: {
          amount: Math.floor(Math.random() * 5000) + 500,
          currency: 'GBP'
        },
        status: 'connected',
        lastSynced: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]
    
    // Maybe add a savings account
    if (Math.random() > 0.5) {
      mockAccounts.push({
        id: crypto.randomUUID(),
        institutionId: randomBank.id,
        institutionName: randomBank.name,
        accountName: 'Savings Account',
        accountType: 'savings',
        mask: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
        currency: 'GBP',
        balance: {
          amount: Math.floor(Math.random() * 10000) + 1000,
          currency: 'GBP'
        },
        status: 'connected',
        lastSynced: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    
    const connection: BankConnection = {
      id: connectionId,
      institutionId: randomBank.id,
      institutionName: randomBank.name,
      accounts: mockAccounts,
      status: 'connected',
      lastSynced: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    this.connections.push(connection)
    console.log('🏦 Mock bank connected:', randomBank.name, publicToken)
    
    return connection
  }
  
  async disconnect(connectionId: ID): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const index = this.connections.findIndex(c => c.id === connectionId)
    if (index !== -1) {
      const connection = this.connections[index]
      console.log('🔌 Mock bank disconnected:', connection.institutionName)
      this.connections.splice(index, 1)
    }
  }
  
  async syncTransactions(connectionId: ID): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const connection = this.connections.find(c => c.id === connectionId)
    if (connection) {
      connection.lastSynced = new Date().toISOString()
      connection.accounts.forEach(account => {
        account.lastSynced = new Date().toISOString()
      })
      console.log('🔄 Mock transactions synced for:', connection.institutionName)
    }
  }
  
  async listAccounts(): Promise<BankAccount[]> {
    await new Promise(resolve => setTimeout(resolve, 200))
    return this.connections.flatMap(c => c.accounts)
  }
}
