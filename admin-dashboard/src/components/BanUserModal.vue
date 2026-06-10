<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    title="Ban User"
    style="width: 440px"
    :mask-closable="!submitting"
    :close-on-esc="!submitting"
    @after-leave="reason = ''"
  >
    <n-space vertical :size="16">
      <n-alert type="warning" :show-icon="true">
        This will immediately disable their account and revoke all active sessions.
        They will not be able to log in until unbanned.
      </n-alert>

      <n-form-item label="Reason (optional)" style="margin-bottom: 0">
        <n-input
          v-model:value="reason"
          type="textarea"
          placeholder="e.g. Violated terms of service"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </n-form-item>
    </n-space>

    <template #footer>
      <n-space justify="end">
        <n-button :disabled="submitting" @click="isVisible = false">Cancel</n-button>
        <n-button type="error" :loading="submitting" @click="submit">Ban User</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  show: boolean
}
interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', reason: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const submitting = ref(false)
const reason = ref('')

const isVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
})

async function submit() {
  submitting.value = true
  try {
    emit('confirm', reason.value.trim())
  } finally {
    submitting.value = false
  }
}
</script>
