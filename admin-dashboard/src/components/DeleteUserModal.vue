<template>
  <n-modal
    v-model:show="isVisible"
    preset="dialog"
    type="error"
    :title="title"
    positive-text="Delete"
    negative-text="Cancel"
    @positive-click="handleConfirm"
    @negative-click="handleCancel"
  >
    <div>
      <p>{{ message }}</p>
      <n-alert v-if="userEmail" type="warning" style="margin-top: 16px">
        <strong>User:</strong> {{ userEmail }}
      </n-alert>
      <p style="margin-top: 16px; color: #666; font-size: 14px">
        This action cannot be undone. All user data including subscriptions, transactions, and bank connections will be permanently deleted.
      </p>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  show: boolean
  userEmail?: string
  title?: string
  message?: string
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Delete User',
  message: 'Are you sure you want to delete this user?',
})

const emit = defineEmits<Emits>()

const isVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
}
</script>
