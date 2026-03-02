/**
 * Permission system types and constants
 * Defines granular permissions for role-based access control
 */

/**
 * Available permissions in the system
 */
export enum Permission {
  // User permissions
  VIEW_OWN_DATA = 'view:own:data',
  EDIT_OWN_DATA = 'edit:own:data',
  DELETE_OWN_ACCOUNT = 'delete:own:account',
  
  // Subscription permissions
  MANAGE_SUBSCRIPTIONS = 'manage:subscriptions',
  VIEW_SUBSCRIPTIONS = 'view:subscriptions',
  
  // Category permissions
  MANAGE_CATEGORIES = 'manage:categories',
  VIEW_CATEGORIES = 'view:categories',
  
  // Transaction permissions
  MANAGE_TRANSACTIONS = 'manage:transactions',
  VIEW_TRANSACTIONS = 'view:transactions',
  
  // Admin permissions
  VIEW_ADMIN_PANEL = 'view:admin:panel',
  MANAGE_USERS = 'manage:users',
  MANAGE_MERCHANT_RULES = 'manage:merchant:rules',
  VIEW_ANALYTICS = 'view:analytics',
  
  // Super admin permissions
  MANAGE_ADMINS = 'manage:admins',
  SYSTEM_CONFIG = 'system:config',
}

/**
 * Base user permissions
 */
const USER_PERMISSIONS: Permission[] = [
  Permission.VIEW_OWN_DATA,
  Permission.EDIT_OWN_DATA,
  Permission.DELETE_OWN_ACCOUNT,
  Permission.MANAGE_SUBSCRIPTIONS,
  Permission.VIEW_SUBSCRIPTIONS,
  Permission.MANAGE_CATEGORIES,
  Permission.VIEW_CATEGORIES,
  Permission.MANAGE_TRANSACTIONS,
  Permission.VIEW_TRANSACTIONS,
]

/**
 * Role definitions with their associated permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  user: USER_PERMISSIONS,
  admin: [
    // Admins have all user permissions plus admin-specific ones
    ...USER_PERMISSIONS,
    Permission.VIEW_ADMIN_PANEL,
    Permission.MANAGE_USERS,
    Permission.MANAGE_MERCHANT_RULES,
    Permission.VIEW_ANALYTICS,
  ],
  superAdmin: [
    // Super admins have all permissions
    Permission.VIEW_OWN_DATA,
    Permission.EDIT_OWN_DATA,
    Permission.DELETE_OWN_ACCOUNT,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.VIEW_SUBSCRIPTIONS,
    Permission.MANAGE_CATEGORIES,
    Permission.VIEW_CATEGORIES,
    Permission.MANAGE_TRANSACTIONS,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_ADMIN_PANEL,
    Permission.MANAGE_USERS,
    Permission.MANAGE_MERCHANT_RULES,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_ADMINS,
    Permission.SYSTEM_CONFIG,
  ],
}

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const rolePermissions = getPermissionsForRole(role)
  return rolePermissions.includes(permission)
}
