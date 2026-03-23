/**
 * Bank Connection Health Composable
 * Provides reactive connection health monitoring and reconnection management
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuth } from './useAuth'
import { getFirebaseAuthToken } from '../utils/authHelpers'

export interface ConnectionHealth {
  connectionId: string
  userId: string
  status: 'connected' | 'pending_expiration' | 'expired' | 'error' | 'disconnected' | 'reconnection_required' | 'reconnecting' | 'reconnection_failed'
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown'
  lastHealthCheck: Date
  lastSuccessfulSync: Date | null
  daysSinceLastSync: number
  issuesDetected: string[]
  reconnectionRequired: boolean
  reconnectionDeadline: Date | null
  nextHealthCheck: Date
}

export interface ReconnectionWorkflow {
  connectionId: string
  userId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  initiatedAt: Date
  completedAt: Date | null
  attempts: number
  maxAttempts: number
  lastAttemptAt: Date | null
  errors: string[]
  backfillRequired: boolean
  backfillCompleted: boolean
}

export function useBankConnectionHealth() {
  const { user } = useAuth()
  
  // Reactive state
  const connectionHealthMap = ref<Map<string, ConnectionHealth>>(new Map())
  const reconnectionWorkflows = ref<Map<string, ReconnectionWorkflow>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastHealthCheckAt = ref<Date | null>(null)
  
  // Health check interval
  let healthCheckInterval: NodeJS.Timeout | null = null
  const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes

  // Memoization key for connection health calculations
  const healthMemoKey = computed(() => {
    const connectionStates = Array.from(connectionHealthMap.value.entries())
      .map(([id, health]) => `${id}:${health.healthStatus}:${health.reconnectionRequired}`)
      .sort().join('|')
    const workflowStates = Array.from(reconnectionWorkflows.value.entries())
      .map(([id, workflow]) => `${id}:${workflow.status}`)
      .sort().join('|')
    return `${connectionStates}||${workflowStates}`
  })

  // Cache for health calculations
  const healthCalculationCache = new Map<string, any>()

  // Single optimized computed for all health data with memoization
  const healthData = computed(() => {
    const memoKey = healthMemoKey.value
    
    // Return cached result if available
    if (healthCalculationCache.has(memoKey)) {
      return healthCalculationCache.get(memoKey)
    }

    const allConnections = Array.from(connectionHealthMap.value.values())
    const activeWorkflows = Array.from(reconnectionWorkflows.value.values())
      .filter(workflow => workflow.status === 'in_progress' || workflow.status === 'pending')

    // Single pass through connections to calculate all metrics
    let healthy = 0
    let warning = 0
    let critical = 0
    let requireReconnection = 0
    
    allConnections.forEach(health => {
      switch (health.healthStatus) {
        case 'healthy': healthy++; break
        case 'warning': warning++; break
        case 'critical': critical++; break
      }
      if (health.reconnectionRequired) requireReconnection++
    })

    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown'
    if (critical > 0) overallStatus = 'critical'
    else if (warning > 0) overallStatus = 'warning'
    else if (healthy > 0) overallStatus = 'healthy'

    const result = {
      allConnectionsHealth: allConnections,
      healthyConnections: allConnections.filter(h => h.healthStatus === 'healthy'),
      warningConnections: allConnections.filter(h => h.healthStatus === 'warning'),
      criticalConnections: allConnections.filter(h => h.healthStatus === 'critical'),
      connectionsRequiringReconnection: allConnections.filter(h => h.reconnectionRequired),
      activeReconnectionWorkflows: activeWorkflows,
      overallHealthStatus: overallStatus,
      healthSummary: {
        total: allConnections.length,
        healthy,
        warning,
        critical,
        requireReconnection,
        activeWorkflows: activeWorkflows.length
      }
    }

    // Cache the result
    healthCalculationCache.set(memoKey, result)
    
    // Clean up old cache entries (keep last 5)
    if (healthCalculationCache.size > 5) {
      const oldestKey = healthCalculationCache.keys().next().value
      if (oldestKey !== undefined) {
        healthCalculationCache.delete(oldestKey)
      }
    }

    return result
  })

  // Individual computed properties that reference the memoized calculation
  const allConnectionsHealth = computed(() => healthData.value.allConnectionsHealth)
  const healthyConnections = computed(() => healthData.value.healthyConnections)
  const warningConnections = computed(() => healthData.value.warningConnections)
  const criticalConnections = computed(() => healthData.value.criticalConnections)
  const connectionsRequiringReconnection = computed(() => healthData.value.connectionsRequiringReconnection)
  const activeReconnectionWorkflows = computed(() => healthData.value.activeReconnectionWorkflows)
  const overallHealthStatus = computed(() => healthData.value.overallHealthStatus)
  const healthSummary = computed(() => healthData.value.healthSummary)

  // API Base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002'

  // Helper function for authenticated API calls
  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await getFirebaseAuthToken()
    
    return fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })
  }

  // Methods
  async function checkConnectionHealth(connectionId: string): Promise<ConnectionHealth | null> {
    if (!user.value?.id) {
      console.warn('User not authenticated')
      return null
    }

    try {
      isLoading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/bank-connections/${connectionId}/health`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        const health: ConnectionHealth = {
          ...data.data,
          lastHealthCheck: new Date(data.data.lastHealthCheck),
          lastSuccessfulSync: data.data.lastSuccessfulSync 
            ? new Date(data.data.lastSuccessfulSync) 
            : null,
          reconnectionDeadline: data.data.reconnectionDeadline
            ? new Date(data.data.reconnectionDeadline)
            : null,
          nextHealthCheck: new Date(data.data.nextHealthCheck)
        }

        connectionHealthMap.value.set(connectionId, health)
        return health
      } else {
        throw new Error(data.error || 'Health check failed')
      }
    } catch (err: any) {
      console.error(`Health check failed for connection ${connectionId}:`, err)
      error.value = err.message || 'Health check failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function checkAllConnectionsHealth(): Promise<void> {
    if (!user.value?.id) {
      console.warn('User not authenticated')
      return
    }

    try {
      isLoading.value = true
      error.value = null

      const response = await fetchWithAuth('/api/bank-connections/health/all')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        const healthData: ConnectionHealth[] = data.data.map((health: any) => ({
          ...health,
          lastHealthCheck: new Date(health.lastHealthCheck),
          lastSuccessfulSync: health.lastSuccessfulSync 
            ? new Date(health.lastSuccessfulSync) 
            : null,
          reconnectionDeadline: health.reconnectionDeadline
            ? new Date(health.reconnectionDeadline)
            : null,
          nextHealthCheck: new Date(health.nextHealthCheck)
        }))

        // Update health map
        connectionHealthMap.value.clear()
        healthData.forEach(health => {
          connectionHealthMap.value.set(health.connectionId, health)
        })

        lastHealthCheckAt.value = new Date()
      } else {
        throw new Error(data.error || 'Health check failed')
      }
    } catch (err: any) {
      console.error('All connections health check failed:', err)
      error.value = err.message || 'Health check failed'
    } finally {
      isLoading.value = false
    }
  }

  async function initiateReconnection(connectionId: string): Promise<boolean> {
    if (!user.value?.id) {
      console.warn('User not authenticated')
      return false
    }

    try {
      isLoading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/bank-connections/${connectionId}/reconnect`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        const workflow: ReconnectionWorkflow = {
          ...data.data,
          initiatedAt: new Date(data.data.initiatedAt),
          completedAt: data.data.completedAt 
            ? new Date(data.data.completedAt)
            : null,
          lastAttemptAt: data.data.lastAttemptAt
            ? new Date(data.data.lastAttemptAt)
            : null
        }

        reconnectionWorkflows.value.set(connectionId, workflow)
        
        // Refresh health status
        await checkConnectionHealth(connectionId)
        
        return true
      } else {
        throw new Error(data.error || 'Reconnection initiation failed')
      }
    } catch (err: any) {
      console.error(`Reconnection initiation failed for ${connectionId}:`, err)
      error.value = err.message || 'Reconnection initiation failed'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function getReconnectionWorkflow(connectionId: string): Promise<ReconnectionWorkflow | null> {
    if (!user.value?.id) {
      console.warn('User not authenticated')
      return null
    }

    try {
      const response = await fetchWithAuth(`/api/bank-connections/${connectionId}/reconnection-workflow`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        const workflow: ReconnectionWorkflow = {
          ...data.data,
          initiatedAt: new Date(data.data.initiatedAt),
          completedAt: data.data.completedAt 
            ? new Date(data.data.completedAt)
            : null,
          lastAttemptAt: data.data.lastAttemptAt
            ? new Date(data.data.lastAttemptAt)
            : null
        }

        reconnectionWorkflows.value.set(connectionId, workflow)
        return workflow
      } else {
        return null
      }
    } catch (err: any) {
      console.error(`Failed to get reconnection workflow for ${connectionId}:`, err)
      return null
    }
  }

  function getConnectionHealth(connectionId: string): ConnectionHealth | null {
    return connectionHealthMap.value.get(connectionId) || null
  }

  function getHealthStatusColor(healthStatus: string): string {
    switch (healthStatus) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  function getHealthStatusIcon(healthStatus: string): string {
    switch (healthStatus) {
      case 'healthy':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'critical':
        return '❌'
      default:
        return '❓'
    }
  }

  function getConnectionStatusMessage(health: ConnectionHealth): string {
    if (health.reconnectionRequired) {
      if (health.reconnectionDeadline) {
        const daysUntilDeadline = Math.ceil(
          (health.reconnectionDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        return `Reconnection required (${daysUntilDeadline} days remaining)`
      }
      return 'Reconnection required'
    }

    if (health.daysSinceLastSync > 7) {
      return `No sync for ${health.daysSinceLastSync} days`
    }

    if (health.daysSinceLastSync > 3) {
      return `Last synced ${health.daysSinceLastSync} days ago`
    }

    if (health.status === 'pending_expiration') {
      return 'Connection expires soon'
    }

    if (health.status === 'connected' && health.healthStatus === 'healthy') {
      return 'Connection healthy'
    }

    return health.issuesDetected[0] || 'Status unknown'
  }

  function startPeriodicHealthChecks(): void {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
    }

    healthCheckInterval = setInterval(async () => {
      if (user.value?.id && allConnectionsHealth.value.length > 0) {
        console.log('🏥 Running periodic health checks...')
        await checkAllConnectionsHealth()
      }
    }, HEALTH_CHECK_INTERVAL)
  }

  function stopPeriodicHealthChecks(): void {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
  }

  // Watch for user changes
  watch(user, (newUser) => {
    if (newUser?.id) {
      // User logged in - start health checks
      checkAllConnectionsHealth()
      startPeriodicHealthChecks()
    } else {
      // User logged out - clear data and stop checks
      connectionHealthMap.value.clear()
      reconnectionWorkflows.value.clear()
      stopPeriodicHealthChecks()
    }
  }, { immediate: true })

  // Lifecycle
  onMounted(() => {
    if (user.value?.id) {
      checkAllConnectionsHealth()
      startPeriodicHealthChecks()
    }
  })

  onUnmounted(() => {
    stopPeriodicHealthChecks()
  })

  return {
    // State
    connectionHealthMap,
    reconnectionWorkflows,
    isLoading,
    error,
    lastHealthCheckAt,

    // Computed
    allConnectionsHealth,
    healthyConnections,
    warningConnections,
    criticalConnections,
    connectionsRequiringReconnection,
    activeReconnectionWorkflows,
    overallHealthStatus,
    healthSummary,

    // Methods
    checkConnectionHealth,
    checkAllConnectionsHealth,
    initiateReconnection,
    getReconnectionWorkflow,
    getConnectionHealth,
    getHealthStatusColor,
    getHealthStatusIcon,
    getConnectionStatusMessage,
    startPeriodicHealthChecks,
    stopPeriodicHealthChecks
  }
}
