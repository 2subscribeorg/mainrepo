<template>
  <AppLayout>
    <router-view />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import { seedDatabase } from '@/data/repo/mock/seedData'

onMounted(async () => {
  // Seed database on first launch
  await seedDatabase()
})
</script>
