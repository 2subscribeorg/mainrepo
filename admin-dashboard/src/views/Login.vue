<template>
  <div class="login-container">
    <n-card title="Superadmin Login" style="max-width: 400px">
      <n-form ref="formRef" :model="formValue" :rules="rules">
        <n-form-item label="Email" path="email">
          <n-input v-model:value="formValue.email" placeholder="admin@2subscribe.com" />
        </n-form-item>
        <n-form-item label="Password" path="password">
          <n-input
            v-model:value="formValue.password"
            type="password"
            placeholder="Password"
            @keyup.enter="handleLogin"
          />
        </n-form-item>
        <n-button type="primary" block :loading="loading" @click="handleLogin">
          Login
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const formValue = ref({
  email: '',
  password: '',
})

const loading = ref(false)

const rules = {
  email: { required: true, message: 'Email is required' },
  password: { required: true, message: 'Password is required' },
}

async function handleLogin(): Promise<void> {
  loading.value = true
  try {
    const success = await authStore.login(formValue.value.email, formValue.value.password)

    if (!success) {
      await authStore.logout()
      message.error('Access denied — not an admin account')
      return
    }

    message.success('Login successful')
    router.push('/')
  } catch (error: any) {
    const code = error?.code || ''
    if (code === 'auth/too-many-requests') {
      message.error('Account temporarily locked — too many failed attempts. Wait a few minutes or reset your password.')
    } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      message.error('Email or password is incorrect')
    } else {
      message.error(error?.message || 'Login failed')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
