<template>
  <div class="breakdown-card">
    <div class="breakdown-card__header">
      <div>
        <p class="breakdown-card__eyebrow">Category breakdown</p>
        <h3 class="breakdown-card__title">Where your money goes</h3>
      </div>
      <span class="breakdown-card__total">{{ totalLabel }}</span>
    </div>
    <div class="breakdown-card__body">
      <div class="breakdown-card__donut" :style="{ background: donutGradient }">
        <div class="breakdown-card__donut-hole">
          <p class="donut-hole__value">{{ formattedTotal }}</p>
          <p class="donut-hole__label">total</p>
        </div>
      </div>
      <ul class="breakdown-card__legend">
        <li v-for="item in data" :key="item.label" class="legend-row">
          <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
          <div class="legend-copy">
            <p class="legend-label">{{ item.label }}</p>
            <p class="legend-sub">
              {{ item.formattedAmount }} · {{ item.percentage.toFixed(0) }}%
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface BreakdownItem {
  label: string
  amount: number
  percentage: number
  formattedAmount: string
  color: string
}

const props = defineProps<{
  data: BreakdownItem[]
  formattedTotal: string
}>()

const donutGradient = computed(() => {
  if (!props.data.length) {
    return 'conic-gradient(var(--color-text-secondary) 0 360deg)'
  }

  let current = 0
  const segments = props.data
    .map((item) => {
      const start = current
      const sweep = (item.percentage / 100) * 360
      current += sweep
      return `${item.color} ${start}deg ${start + sweep}deg`
    })
    .join(', ')

  return `conic-gradient(${segments})`
})

const totalLabel = computed(() => `${props.data.length} categories`)
</script>

<style scoped>
.breakdown-card {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.breakdown-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-card__eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.08em;
}

.breakdown-card__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.breakdown-card__total {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.breakdown-card__body {
  display: flex;
  gap: 1.5rem;
}

.breakdown-card__donut {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 12px rgba(255, 255, 255, 0.4);
}

.breakdown-card__donut-hole {
  position: absolute;
  inset: 25%;
  border-radius: 50%;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
}

.donut-hole__value {
  font-weight: 700;
  color: var(--color-text-primary);
}

.donut-hole__label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.breakdown-card__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.legend-sub {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

@media (max-width: 640px) {
  .breakdown-card__body {
    flex-direction: column;
    align-items: center;
  }
}
</style>
