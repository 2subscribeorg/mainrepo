<template>
  <Teleport to="body">
    <div v-if="show" class="paywall-overlay" @click.self="handleClose">
      <div class="paywall-modal">
        <div class="paywall-modal__icon">
          <Lock :size="32" class="text-white" />
        </div>

        <h2 class="paywall-modal__title">Upgrade to 2Subscribe Pro</h2>
        <p class="paywall-modal__message">{{ message }}</p>

        <div class="paywall-modal__actions">
          <button
            class="paywall-modal__upgrade-btn"
            @click="handleUpgrade"
          >
            Upgrade to Pro
          </button>
          <button
            class="paywall-modal__dismiss-btn"
            @click="handleClose"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

withDefaults(defineProps<{
  show: boolean
  message?: string
}>(), {
  message: 'You\'ve reached the free plan limit. Upgrade to Pro for unlimited access.',
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

function handleClose() {
  emit('close')
}

function handleUpgrade() {
  emit('close')
  router.push('/platform-subscription')
}
</script>

<style scoped>
.paywall-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  padding: 1.5rem;
}

.paywall-modal {
  background: var(--color-surface, #fff);
  border-radius: 1.5rem;
  padding: 2rem;
  max-width: 24rem;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.paywall-modal__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 1.5rem;
  margin: 0 auto 1.25rem;
  background: linear-gradient(135deg, var(--color-primary, #6366f1) 0%, #4A2FB0 100%);
}

.paywall-modal__title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #1e293b);
  margin-bottom: 0.5rem;
}

.paywall-modal__message {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #64748b);
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.paywall-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.paywall-modal__upgrade-btn {
  width: 100%;
  padding: 0.875rem;
  border: none;
  border-radius: 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(to right, var(--color-primary, #6366f1) 0%, #4A2FB0 100%);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.paywall-modal__upgrade-btn:active {
  transform: scale(0.98);
}

.paywall-modal__dismiss-btn {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  background: transparent;
  cursor: pointer;
}

.paywall-modal__dismiss-btn:hover {
  color: var(--color-text-primary, #1e293b);
}
</style>
