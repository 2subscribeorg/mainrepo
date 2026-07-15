<template>
  <n-layout style="height: 100vh; overflow: hidden">
    <div class="shell">
      <!-- Fixed sidebar -->
      <aside class="sidebar">
        <div class="logo">2Subscribe</div>
        <n-menu
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleMenuSelect"
          style="flex: 1; overflow-y: auto"
        />
        <div class="sidebar-footer">
          <n-button text @click="handleLogout" style="color: #e88080; width: 100%; padding: 0 20px; justify-content: flex-start">
            <template #icon><n-icon><LogoutIcon /></n-icon></template>
            Logout
          </n-button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="main">
        <n-layout-header bordered style="padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0">
          <span style="font-weight: 600; font-size: 16px">{{ pageTitle }}</span>
          <n-tag type="success" size="small">{{ userEmail }}</n-tag>
        </n-layout-header>
        <n-layout-content style="padding: 24px; overflow-y: auto; flex: 1">
          <router-view />
        </n-layout-content>
      </div>
    </div>
  </n-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { h } from 'vue'
import {
  Dashboard as DashboardIcon,
  Users as UsersIcon,
  CreditCard as SubscriptionsIcon,
  Shield as AdminUsersIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@vicons/tabler'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const userEmail = computed(() => authStore.user?.email || '')
const activeKey = computed(() => route.name as string)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: 'Dashboard',
    Users: 'User Management',
    Subscriptions: 'Subscriptions',
    AdminUsers: 'Admin Users',
    Settings: 'Settings',
  }
  return titles[route.name as string] || 'Admin'
})

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed(() => {
  const perms = authStore.permissions
  const items = [
    { label: 'Dashboard', key: 'Dashboard', icon: renderIcon(DashboardIcon) },
  ]
  if (perms.includes('users_read') || perms.includes('users_write')) {
    items.push({ label: 'Users', key: 'Users', icon: renderIcon(UsersIcon) })
  }
  if (perms.includes('subscriptions_read') || perms.includes('subscriptions_write')) {
    items.push({ label: 'Subscriptions', key: 'Subscriptions', icon: renderIcon(SubscriptionsIcon) })
  }
  if (perms.includes('super_admin')) {
    items.push({ label: 'Admin Users', key: 'AdminUsers', icon: renderIcon(AdminUsersIcon) })
  }
  items.push({ label: 'Settings', key: 'Settings', icon: renderIcon(SettingsIcon) })
  return items
})

function handleMenuSelect(key: string) {
  router.push({ name: key })
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.09);
  background: var(--n-color);
  flex-shrink: 0;
}

.logo {
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 18px;
  font-weight: 700;
  color: #63e2b7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding: 12px 0;
  flex-shrink: 0;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
