<template>
  <div class="platform-subscription-view">
    <PlatformSubscriptionManager />
  </div>
</template>

<script setup lang="ts">
import PlatformSubscriptionManager from '@/components/subscription/PlatformSubscriptionManager.vue'
</script>

<style scoped>
.platform-subscription-view {
  min-height: 100vh;
  background: #f9fafb;
  padding: 2rem 0;
}
</style>
