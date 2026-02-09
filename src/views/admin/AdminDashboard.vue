<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Admin Header -->
    <AdminHeader />
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p class="mt-2 text-gray-600">Manage users and monitor system activity</p>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-gray-200 mb-8">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Users Tab -->
        <div v-if="activeTab === 'users'">
          <UserManagement />
        </div>

        <!-- Activities Tab -->
        <div v-if="activeTab === 'activities'">
          <SystemActivities />
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'">
          <AdminSettings />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import SystemActivities from '@/components/admin/SystemActivities.vue'
import AdminSettings from '@/components/admin/AdminSettings.vue'

const activeTab = ref('users')

const tabs = [
  { id: 'users', name: 'User Management' },
  { id: 'activities', name: 'System Activities' },
  { id: 'settings', name: 'Settings' }
]
</script>
