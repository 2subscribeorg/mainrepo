<template>
  <div class="action-card">
    <div class="action-card__content">
      <p class="action-card__label">Marked as subscriptions</p>
      <p class="action-card__value">{{ markedCount }}</p>
      <p class="action-card__subtitle">Bank transactions already tagged</p>
    </div>
    <button class="action-card__button" @click="$emit('go-to-transactions')">
      Review
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  markedCount: number
}>()

defineEmits<{
  (e: 'go-to-transactions'): void
}>()
</script>

<style scoped>
.action-card {
  border: 1px solid var(--color-success-border);
  border-radius: var(--radius-2xl);
  background: var(--color-success-bg);
  padding: var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.action-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.action-card__value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-success);
}

.action-card__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.action-card__button {
  border: none;
  border-radius: var(--radius-full);
  padding: var(--padding-touch-md);
  font-weight: var(--font-weight-semibold);
  color: white;
  background: var(--color-primary);
  cursor: pointer;
  transition: transform var(--duration-fast) ease;
}

.action-card__button:hover {
  transform: translateY(-1px);
}
</style>
