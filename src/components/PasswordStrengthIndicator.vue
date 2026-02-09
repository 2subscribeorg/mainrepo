<template>
  <div v-if="password" class="password-strength-indicator">
    <!-- Strength Bar -->
    <div class="relative h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
      <div
        class="h-full transition-all duration-300 ease-out"
        :class="strengthColor"
        :style="{ width: `${strength.percentage}%` }"
      />
    </div>

    <!-- Strength Label -->
    <div class="mt-2 flex items-center justify-between">
      <span class="text-xs font-medium" :class="strengthTextColor">
        {{ strength.label }}
      </span>
      <span class="text-xs text-text-muted">
        {{ strength.score }}/{{ totalRequirements }}
      </span>
    </div>

    <!-- Requirements List -->
    <ul class="mt-3 space-y-1.5">
      <li
        v-for="requirement in requirements"
        :key="requirement.id"
        class="flex items-center gap-2 text-xs"
      >
        <span
          v-if="isPassed(requirement.id)"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span
          v-else
          class="h-4 w-4 rounded-full border-2 border-border-light"
        />
        <span :class="isPassed(requirement.id) ? 'text-text-secondary line-through' : 'text-text-primary'">
          {{ requirement.label }}
        </span>
      </li>
    </ul>

    <!-- Common Password Warning -->
    <div v-if="showCommonPasswordWarning" class="mt-3 rounded-lg bg-warning-bg border border-warning-border p-2">
      <p class="text-xs text-warning-text">
        ⚠️ This password is too common. Please choose a stronger password.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  PASSWORD_REQUIREMENTS,
  calculatePasswordStrength,
  getPasswordStrengthColor,
  isCommonWeakPassword,
  type PasswordRequirement
} from '@/utils/passwordValidation'

interface Props {
  password: string
}

const props = defineProps<Props>()

const requirements = PASSWORD_REQUIREMENTS

const totalRequirements = computed(() => PASSWORD_REQUIREMENTS.length)

const strength = computed(() => calculatePasswordStrength(props.password))

const strengthColor = computed(() => getPasswordStrengthColor(strength.value))

const strengthTextColor = computed(() => {
  if (strength.value.score === 0 || strength.value.score === 1) return 'text-error'
  if (strength.value.score === 2 || strength.value.score === 3) return 'text-warning'
  if (strength.value.score === 4) return 'text-info'
  return 'text-success'
})

const showCommonPasswordWarning = computed(() => {
  return props.password && isCommonWeakPassword(props.password)
})

function isPassed(requirementId: string): boolean {
  return strength.value.passedRequirements.includes(requirementId)
}
</script>

<style scoped>
.password-strength-indicator {
  @apply mt-3;
}
</style>
