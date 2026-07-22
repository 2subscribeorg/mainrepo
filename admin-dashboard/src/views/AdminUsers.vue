<template>
  <div>
    <n-card title="Admin Users">
      <template #header-extra>
        <n-button type="primary" @click="showModal = true">
          <template #icon><n-icon><UserPlus /></n-icon></template>
          Add Admin
        </n-button>
      </template>

      <n-data-table
        :columns="columns"
        :data="admins"
        :loading="loading"
        :row-key="rowKey"
        size="small"
        striped
      />
    </n-card>

    <!-- Add Admin modal -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      title="Add Admin"
      style="width: 480px"
      :mask-closable="!submitting"
      :close-on-esc="!submitting"
      @after-leave="resetForm"
    >
      <n-alert v-if="modalError" type="error" :show-icon="true" style="margin-bottom: 16px" closable @close="modalError = ''">
        {{ modalError }}
      </n-alert>

      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top" :disabled="submitting">
        <n-form-item label="Email" path="email">
          <n-input v-model:value="form.email" type="email" placeholder="admin@example.com" />
        </n-form-item>

        <n-form-item label="Display Name" path="displayName">
          <n-input v-model:value="form.displayName" placeholder="Full name" />
        </n-form-item>

        <n-form-item label="Permissions" path="permissions">
          <div style="width: 100%">
            <div style="display: grid; grid-template-columns: 140px 80px 80px; gap: 8px; margin-bottom: 6px; font-size: 12px; color: #999; padding: 0 4px">
              <span>Section</span>
              <span style="text-align: center">Read</span>
              <span style="text-align: center">Write</span>
            </div>
            <div style="display: grid; grid-template-columns: 140px 80px 80px; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 4px">
              <span style="font-size: 14px">Users</span>
              <div style="text-align: center">
                <n-checkbox
                  :checked="form.permissions.includes('users_read') || form.permissions.includes('users_write')"
                  :disabled="form.permissions.includes('users_write')"
                  @update:checked="(v: boolean) => togglePerm('users_read', v)"
                />
              </div>
              <div style="text-align: center">
                <n-checkbox
                  :checked="form.permissions.includes('users_write')"
                  @update:checked="(v: boolean) => togglePerm('users_write', v)"
                />
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 140px 80px 80px; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 4px">
              <span style="font-size: 14px">Subscriptions</span>
              <div style="text-align: center">
                <n-checkbox
                  :checked="form.permissions.includes('subscriptions_read') || form.permissions.includes('subscriptions_write')"
                  :disabled="form.permissions.includes('subscriptions_write')"
                  @update:checked="(v: boolean) => togglePerm('subscriptions_read', v)"
                />
              </div>
              <div style="text-align: center">
                <n-checkbox
                  :checked="form.permissions.includes('subscriptions_write')"
                  @update:checked="(v: boolean) => togglePerm('subscriptions_write', v)"
                />
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 140px 80px 80px; gap: 8px; align-items: center; padding: 6px 4px; border-radius: 4px">
              <span style="font-size: 14px">Super Admin</span>
              <div style="text-align: center; grid-column: 2 / 4">
                <n-checkbox
                  :checked="form.permissions.includes('super_admin')"
                  @update:checked="(v: boolean) => togglePerm('super_admin', v)"
                />
              </div>
            </div>
          </div>
        </n-form-item>

        <n-form-item label="Password" path="password">
          <n-input v-model:value="form.password" type="password" placeholder="Min. 12 characters" show-password-on="click" />
        </n-form-item>

        <!-- Live password strength checklist -->
        <div v-if="form.password.length > 0" style="margin-top: -8px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 4px;">
          <div
            v-for="rule in passwordChecks"
            :key="rule.label"
            :style="{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: rule.met ? '#18a058' : '#999' }"
          >
            <span>{{ rule.met ? '✓' : '○' }}</span>
            <span>{{ rule.label }}</span>
          </div>
        </div>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button :disabled="submitting" @click="showModal = false">Cancel</n-button>
          <n-button type="primary" :loading="submitting" :disabled="!isPasswordValid" @click="submitForm">Create Admin</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- Delete confirm modal -->
    <n-modal
      v-model:show="showDeleteConfirm"
      preset="dialog"
      type="error"
      title="Delete Admin User"
      :content="`Remove ${deleteTarget?.email} from admin users? This cannot be undone.`"
      positive-text="Delete"
      negative-text="Cancel"
      :loading="deleting"
      @positive-click="confirmDelete"
      @negative-click="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, NTag, NButton, NSpace, NIcon, NTooltip, NEllipsis, type FormInst, type FormRules } from 'naive-ui'
import { Eye, TrashX, UserPlus } from '@vicons/tabler'
import type { DataTableColumns } from 'naive-ui'
import { superAdminsApi, type SuperAdmin } from '@/api/superAdmins'
import { useAuthStore } from '@/stores/auth'
import { format } from 'date-fns'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const admins = ref<SuperAdmin[]>([])
const loading = ref(false)

const showModal = ref(false)
const submitting = ref(false)
const modalError = ref('')
const formRef = ref<FormInst | null>(null)

const showDeleteConfirm = ref(false)
const deleteTarget = ref<SuperAdmin | null>(null)
const deleting = ref(false)

const form = ref({ email: '', displayName: '', password: '', permissions: [] as string[] })

const passwordChecks = computed(() => [
  { label: 'At least 12 characters',  met: form.value.password.length >= 12 },
  { label: 'One capital letter (A–Z)', met: /[A-Z]/.test(form.value.password) },
  { label: 'One number (0–9)',         met: /[0-9]/.test(form.value.password) },
  { label: 'One special character',   met: /[^A-Za-z0-9]/.test(form.value.password) },
])

const isPasswordValid = computed(() => passwordChecks.value.every(r => r.met))

function validatePasswordStrength(_rule: unknown, _value: string): Promise<void> {
  const failed = passwordChecks.value.filter(r => !r.met).map(r => r.label)
  if (failed.length) return Promise.reject(new Error('Password must include: ' + failed.join(', ')))
  return Promise.resolve()
}

const formRules: FormRules = {
  email: [
    { required: true, message: 'Email is required', trigger: 'blur' },
    { type: 'email', message: 'Enter a valid email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Password is required', trigger: 'blur' },
    { validator: validatePasswordStrength, trigger: 'blur' },
  ],
}

const rowKey = (row: SuperAdmin) => row.id

const permissionLabel: Record<string, string> = {
  users_read: 'Users (Read)',
  users_write: 'Users (Write)',
  subscriptions_read: 'Subscriptions (Read)',
  subscriptions_write: 'Subscriptions (Write)',
  super_admin: 'Super Admin',
}

function togglePerm(perm: string, checked: boolean) {
  const perms = new Set(form.value.permissions)
  if (checked) {
    perms.add(perm)
    if (perm === 'users_write') perms.delete('users_read')
    if (perm === 'subscriptions_write') perms.delete('subscriptions_read')
  } else {
    perms.delete(perm)
  }
  form.value.permissions = [...perms]
}

const columns: DataTableColumns<SuperAdmin> = [
  {
    title: 'Name',
    key: 'displayName',
    width: 160,
    render: (row) =>
      h('div', { style: 'display: flex; align-items: center; gap: 6px' }, [
        h(NEllipsis, { style: 'max-width: 130px' }, { default: () => row.displayName || '—' }),
        row.id === authStore.user?.id
          ? h(NTag, { size: 'tiny', type: 'info' }, { default: () => 'You' })
          : null,
      ]),
  },
  {
    title: 'Email',
    key: 'email',
    width: 220,
    render: (row) => h(NEllipsis, { style: 'max-width: 210px' }, { default: () => row.email }),
  },
  {
    title: 'Permissions',
    key: 'permissions',
    render: (row) =>
      row.permissions.length
        ? h(NSpace, { size: 4, wrap: true }, {
            default: () =>
              row.permissions.map(p =>
                h(NTag, { size: 'tiny', bordered: false }, { default: () => permissionLabel[p] || p })
              ),
          })
        : h('span', { style: 'color: #999' }, '—'),
  },
  {
    title: 'Status',
    key: 'isActive',
    width: 90,
    render: (row) =>
      h(NTag, { size: 'small', type: row.isActive ? 'success' : 'default' }, {
        default: () => row.isActive ? 'Active' : 'Inactive',
      }),
  },
  {
    title: 'Created',
    key: 'createdAt',
    width: 110,
    render: (row) => {
      try { return format(new Date(row.createdAt), 'dd MMM yyyy') } catch { return '—' }
    },
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 90,
    render: (row) =>
      h(NSpace, { size: 4 }, {
        default: () => [
          h(NTooltip, null, {
            trigger: () =>
              h(NButton, { size: 'small', quaternary: true, onClick: () => router.push(`/admin-users/${row.id}`) }, {
                icon: () => h(NIcon, null, { default: () => h(Eye) }),
              }),
            default: () => 'View',
          }),
          h(NTooltip, null, {
            trigger: () =>
              h(NButton, {
                size: 'small',
                quaternary: true,
                type: 'error',
                disabled: row.id === authStore.user?.id,
                onClick: () => openDelete(row),
              }, {
                icon: () => h(NIcon, null, { default: () => h(TrashX) }),
              }),
            default: () => row.id === authStore.user?.id ? "Can't delete yourself" : 'Delete',
          }),
        ],
      }),
  },
]

async function load() {
  loading.value = true
  try {
    admins.value = await superAdminsApi.list()
  } catch (err: any) {
    message.error('Failed to load admin users')
  } finally {
    loading.value = false
  }
}

function openDelete(row: SuperAdmin) {
  deleteTarget.value = row
  showDeleteConfirm.value = true
}

function resetForm() {
  form.value = { email: '', displayName: '', password: '', permissions: [] }
  modalError.value = ''
}

async function submitForm() {
  modalError.value = ''
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const created = await superAdminsApi.create({
      email: form.value.email,
      displayName: form.value.displayName || undefined,
      permissions: form.value.permissions,
      password: form.value.password,
    })
    admins.value.unshift(created)
    message.success(`Admin ${form.value.email} created`)
    showModal.value = false
  } catch (err: any) {
    const details = err?.response?.data?.error?.details
    if (Array.isArray(details) && details.length) {
      modalError.value = details.map((d: string) => d.replace(/^password:\s*/i, '')).join(' · ')
    } else {
      modalError.value =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to create admin'
    }
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await superAdminsApi.delete(deleteTarget.value.id)
    admins.value = admins.value.filter((a: SuperAdmin) => a.id !== deleteTarget.value!.id)
    message.success('Admin removed')
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } catch (err: any) {
    message.error('Failed to delete admin')
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>
