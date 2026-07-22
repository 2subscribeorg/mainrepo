import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

export interface SuperAdmin {
  id: string
  email: string
  displayName?: string
  permissions: string[]
  isActive: boolean
  createdAt: string
  createdBy?: string
  authUid?: string
}

export interface CreateSuperAdminBody {
  email: string
  displayName?: string
  permissions?: string[]
  password: string
}

export interface UpdateSuperAdminBody {
  email?: string
  displayName?: string
  permissions?: string[]
  isActive?: boolean
}

export const PERMISSION_OPTIONS = [
  { label: 'Users (Read)',          value: 'users_read',          group: 'users' },
  { label: 'Users (Write)',         value: 'users_write',         group: 'users' },
  { label: 'Subscriptions (Read)',  value: 'subscriptions_read',  group: 'subscriptions' },
  { label: 'Subscriptions (Write)', value: 'subscriptions_write', group: 'subscriptions' },
  { label: 'Super Admin',           value: 'super_admin',         group: 'super_admin' },
]

export const superAdminsApi = {
  async list(): Promise<SuperAdmin[]> {
    const { data } = await apiClient.get<ApiResponse<{ adminUsers: SuperAdmin[] }>>('/admin-users')
    return data.data!.adminUsers
  },

  async get(id: string): Promise<SuperAdmin> {
    const { data } = await apiClient.get<ApiResponse<{ adminUser: SuperAdmin }>>(`/admin-users/${id}`)
    return data.data!.adminUser
  },

  async create(body: CreateSuperAdminBody): Promise<SuperAdmin> {
    const { data } = await apiClient.post<ApiResponse<{ adminUser: SuperAdmin }>>('/admin-users', body)
    return data.data!.adminUser
  },

  async update(id: string, body: UpdateSuperAdminBody): Promise<SuperAdmin> {
    const { data } = await apiClient.patch<ApiResponse<{ adminUser: SuperAdmin }>>(`/admin-users/${id}`, body)
    return data.data!.adminUser
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/admin-users/${id}`)
  },
}
