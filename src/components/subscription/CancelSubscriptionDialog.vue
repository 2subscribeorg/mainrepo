<template>
  <div class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h3>Cancel Subscription</h3>
      
      <p class="warning-text">
        Are you sure you want to cancel your subscription?
      </p>

      <div class="cancellation-options">
        <div class="option-card" :class="{ selected: !immediate }" @click="immediate = false">
          <div class="option-header">
            <input type="radio" :checked="!immediate" @change="immediate = false" />
            <h4>Cancel at period end</h4>
          </div>
          <p class="option-description">
            You'll retain access until {{ subscription ? formatDate(subscription.nextPaymentDate) : 'end of period' }}.
            No refund will be issued.
          </p>
          <p class="option-note">Recommended</p>
        </div>

        <div class="option-card" :class="{ selected: immediate }" @click="immediate = true">
          <div class="option-header">
            <input type="radio" :checked="immediate" @change="immediate = true" />
            <h4>Cancel immediately</h4>
          </div>
          <p class="option-description">
            Your access will end immediately. No refund will be issued.
          </p>
        </div>
      </div>

      <div class="consequences">
        <h4>What you'll lose:</h4>
        <ul>
          <li>Unlimited bank subscriptions</li>
          <li>Automatic Plaid sync</li>
          <li>Advanced categorization</li>
          <li>Budget tracking</li>
          <li>Email notifications</li>
          <li>Priority support</li>
        </ul>
      </div>

      <div class="modal-actions">
        <button @click="$emit('cancel')" class="btn-secondary">
          Keep Subscription
        </button>
        <button @click="confirmCancel" class="btn-danger">
          {{ immediate ? 'Cancel Now' : 'Cancel at Period End' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Subscription } from '@/domain/models'

interface Props {
  subscription: Subscription | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  cancel: []
  confirm: [immediate: boolean]
}>()

const immediate = ref(false)

function confirmCancel() {
  emit('confirm', immediate.value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.warning-text {
  color: #666;
  margin-bottom: 1.5rem;
}

.cancellation-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.option-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:hover {
  border-color: #3b82f6;
}

.option-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.option-header input[type="radio"] {
  cursor: pointer;
}

.option-header h4 {
  font-size: 1rem;
  margin: 0;
}

.option-description {
  color: #666;
  font-size: 0.875rem;
  margin-left: 1.75rem;
  margin-bottom: 0.5rem;
}

.option-note {
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 1.75rem;
}

.consequences {
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.consequences h4 {
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  color: #92400e;
}

.consequences ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.consequences li {
  padding: 0.25rem 0;
  color: #92400e;
  font-size: 0.875rem;
}

.consequences li::before {
  content: '✗ ';
  color: #dc2626;
  font-weight: 700;
  margin-right: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
}

.btn-secondary,
.btn-danger {
  flex: 1;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}
</style>
