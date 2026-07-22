<template>
  <div ref="emptyStateRef" class="text-center py-12 fade-in max-w-md mx-auto">
    <!-- Illustration / Icon well -->
    <div class="relative mx-auto mb-6">
      <div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-surface-elevated mx-auto">
        <slot name="icon">
          <svg class="h-10 w-10 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </slot>
      </div>
      <div class="absolute inset-0 -z-10 mx-auto h-20 w-20 rounded-3xl bg-primary/5 blur-xl"></div>
    </div>

    <!-- Eyebrow -->
    <p v-if="eyebrow" class="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2 slide-down">
      {{ eyebrow }}
    </p>

    <!-- Title -->
    <h3 class="text-lg font-semibold text-text-primary slide-down">{{ title }}</h3>

    <!-- Description -->
    <p class="mt-2 text-sm text-text-secondary max-w-sm mx-auto slide-down">{{ description }}</p>

    <!-- Tips / contextual guidance -->
    <slot name="guidance">
      <ul v-if="tips && tips.length" class="mt-5 space-y-2 text-left max-w-xs mx-auto">
        <li
          v-for="(tip, i) in tips"
          :key="i"
          class="flex items-start gap-2 text-sm text-text-secondary slide-down"
          :style="{ animationDelay: `${i * 80}ms` }"
        >
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ tip }}</span>
        </li>
      </ul>
    </slot>

    <!-- Actions -->
    <div class="mt-8 flex flex-col items-center gap-3">
      <slot name="actions">
        <router-link
          v-if="actionText && actionTo"
          :to="actionTo"
          class="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-all duration-150 btn-animated shadow-lg shadow-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {{ actionText }}
        </router-link>
        <router-link
          v-if="secondaryActionText && secondaryActionTo"
          :to="secondaryActionTo"
          class="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:underline"
        >
          {{ secondaryActionText }}
        </router-link>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAnimations } from '@/utils/useAnimations'

interface Props {
  title: string
  description: string
  eyebrow?: string
  tips?: string[]
  actionText?: string
  actionTo?: string
  secondaryActionText?: string
  secondaryActionTo?: string
}

defineProps<Props>()

// Use animation utilities
const { animateEntrance } = useAnimations()
const emptyStateRef = ref<HTMLElement>()

onMounted(() => {
  if (emptyStateRef.value) {
    animateEntrance(emptyStateRef.value, 'fade-in', 200)
  }
})
</script>
