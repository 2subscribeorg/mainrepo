<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-10">
    <!-- Logo / Hero -->
    <div class="mb-8">
      <div
        class="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 3h12l4 6-10 13L2 9Z" />
          <path d="M11 3 8 9l4 13 4-13-3-6" />
          <path d="M2 9h20" />
        </svg>
      </div>
    </div>

    <!-- Title -->
    <h1 class="text-3xl font-bold text-text-primary mb-3">Welcome to 2Subscribe</h1>
    <p class="text-base text-text-secondary mb-8 max-w-sm">
      Track your subscriptions, monitor spending, and never miss a renewal. Let's get you started.
    </p>

    <!-- Feature highlights -->
    <div class="grid gap-4 w-full max-w-sm mb-10">
      <div
        v-for="feature in features"
        :key="feature.title"
        class="flex items-start gap-4 rounded-2xl bg-white/95 p-4 shadow-sm border border-slate-100 text-left"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          :class="feature.bgClass"
        >
          <component :is="feature.icon" :size="20" :class="feature.textClass" />
        </div>
        <div>
          <p class="font-semibold text-text-primary text-sm">{{ feature.title }}</p>
          <p class="text-xs text-text-secondary mt-0.5">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <button
      type="button"
      :disabled="loading"
      class="w-full max-w-sm bg-primary text-white py-3.5 px-6 rounded-2xl font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      @click="$emit('get-started')"
    >
      <span v-if="loading">Setting up...</span>
      <span v-else>Get Started</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { CreditCard, Bell, TrendingDown } from 'lucide-vue-next'

defineEmits<{
  'get-started': []
}>()

defineProps<{
  loading?: boolean
}>()

const features = [
  {
    title: 'Track Subscriptions',
    description: 'See all your subscriptions in one place with renewal dates.',
    icon: CreditCard,
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-600',
  },
  {
    title: 'Renewal Reminders',
    description: 'Get notified before subscriptions renew so you can cancel in time.',
    icon: Bell,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
  },
  {
    title: 'Spending Insights',
    description: 'Understand where your money goes with clear breakdowns.',
    icon: TrendingDown,
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
  },
]
</script>
