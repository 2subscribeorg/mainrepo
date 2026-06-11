<template>
  <n-modal
    v-model:show="isVisible"
    preset="card"
    title="Add User"
    style="width: 440px"
    :mask-closable="!submitting"
    :close-on-esc="!submitting"
    @after-leave="resetForm"
  >
    <n-alert v-if="submitError" type="error" :show-icon="true" style="margin-bottom: 16px" closable @close="submitError = ''">
      {{ submitError }}
    </n-alert>

    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-placement="top"
      :disabled="submitting"
    >
      <n-form-item label="Email" path="email">
        <n-input
          v-model:value="form.email"
          type="email"
          placeholder="user@example.com"
          @keydown.enter="submit"
        />
      </n-form-item>

      <n-form-item label="Display Name" path="displayName">
        <n-input
          v-model:value="form.displayName"
          placeholder="Full name"
          @keydown.enter="submit"
        />
      </n-form-item>

      <n-form-item label="Password" path="password">
        <n-input
          v-model:value="form.password"
          type="password"
          show-password-on="click"
          placeholder="Min. 6 characters"
          @keydown.enter="submit"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button :disabled="submitting" @click="isVisible = false">Cancel</n-button>
        <n-button type="primary" :loading="submitting" @click="submit">Create User</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { usersApi } from '@/api/users'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'created'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const submitError = ref('')

const form = ref({ email: '', displayName: '', password: '' })

const rules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email', trigger: 'blur' },
  ],
  displayName: [
    { required: true, message: 'Display name is required', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { min: 6, message: 'At least 6 characters', trigger: 'blur' },
  ],
}

const isVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val),
})

function resetForm() {
  form.value = { email: '', displayName: '', password: '' }
  submitError.value = ''
}

async function submit() {
  submitError.value = ''
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    await usersApi.createUser({
      email: form.value.email,
      password: form.value.password,
      displayName: form.value.displayName,
    })
    message.success(`User ${form.value.email} created`)
    isVisible.value = false
    emit('created')
  } catch (err: any) {
    submitError.value =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Failed to create user'
  } finally {
    submitting.value = false
  }
}
</script>
