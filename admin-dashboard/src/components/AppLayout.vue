<template>
  <n-layout has-sider style="min-height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="220"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo" :class="{ collapsed }">
        <span v-if="!collapsed">2Subscribe</span>
        <span v-else>2S</span>
      </div>
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuSelect"
      />
      <div class="sider-footer" :class="{ collapsed }">
        <n-button text @click="handleLogout" style="color: #e88080">
          <template #icon>
            <n-icon><LogoutIcon /></n-icon>
          </template>
          <span v-if="!collapsed">Logout</span>
        </n-button>
      </div>
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered style="padding: 16px 24px; display: flex; align-items: center; justify-content: space-between">
        <span style="font-weight: 600; font-size: 16px">{{ pageTitle }}</span>
        <n-tag type="success" size="small">{{ userEmail }}</n-tag>
      </n-layout-header>
      <n-layout-content style="padding: 24px">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NIcon } from 'naive-ui'
import { h } from 'vue'
import {
  Dashboard as DashboardIcon,
  Users as UsersIcon,
  CreditCard as SubscriptionsIcon,
  Logout as LogoutIcon,
} from '@vicons/tabler'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const collapsed = ref(false)

const userEmail = computed(() => authStore.user?.email || '')

const activeKey = computed(() => route.name as string)

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: 'Dashboard',
    Users: 'User Management',
    Subscriptions: 'Subscriptions',
  }
  return titles[route.name as string] || 'Admin'
})

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: 'Dashboard',
    key: 'Dashboard',
    icon: renderIcon(DashboardIcon),
  },
  {
    label: 'Users',
    key: 'Users',
    icon: renderIcon(UsersIcon),
  },
  {
    label: 'Subscriptions',
    key: 'Subscriptions',
    icon: renderIcon(SubscriptionsIcon),
  },
]

function handleMenuSelect(key: string) {
  router.push({ name: key })
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #63e2b7;
  border-bottom: 1px solid rgba(255,255,255,0.09);
  letter-spacing: 0.5px;
  transition: all 0.2s;
}
.logo.collapsed {
  font-size: 14px;
}
.sider-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.09);
  display: flex;
  justify-content: center;
}
.sider-footer.collapsed {
  padding: 16px 8px;
}
</style>
