<template>
  <div class="stat-card">
    <div class="stat-card__header">
      <span class="stat-card__label">Active subscriptions</span>
      <span class="stat-card__badge">{{ trendLabel }}</span>
    </div>
    <p class="stat-card__value">{{ activeCount }}</p>
    <p class="stat-card__subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeCount: number
  trendLabel?: string
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  trendLabel: 'Live',
  subtitle: 'Auto-renewing plans',
})
</script>

<style scoped>
.stat-card {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-card__badge {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-info-text);
}

.stat-card__value {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
}

.stat-card__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}
</style>
