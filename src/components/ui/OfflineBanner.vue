<template>
  <Transition name="banner">
    <div
      v-if="!isOnline || showReconnected"
      :class="[
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium',
        isOnline ? 'bg-green-500 text-white' : 'bg-slate-800 text-white'
      ]"
    >
      <span v-if="!isOnline" class="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
      <span v-else class="h-2 w-2 rounded-full bg-green-300" />
      {{ isOnline ? 'Back online' : 'No internet connection' }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

const { isOnline } = useNetworkStatus()
const showReconnected = ref(false)

watch(isOnline, (online) => {
  if (online) {
    showReconnected.value = true
    setTimeout(() => { showReconnected.value = false }, 2500)
  }
})
</script>

<style scoped>
.banner-enter-active,
.banner-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
