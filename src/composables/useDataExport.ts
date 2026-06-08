import { ref } from 'vue'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { getFirebaseDb, getFirebaseAuth } from '@/config/firebase'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const FileSaver = registerPlugin<{
  saveFile(options: { filename: string; content: string }): Promise<void>
}>('FileSaver')

type ExportStatus = 'idle' | 'loading' | 'ready' | 'saved' | 'error'

function flattenRecord(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenRecord(value as Record<string, unknown>, fullKey))
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value)
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    allKeys.join(','),
    ...rows.map(row => allKeys.map(k => escape(row[k])).join(',')),
  ].join('\n')
}

export function useDataExport() {
  const status = ref<ExportStatus>('idle')
  const error = ref<string | null>(null)
  const savedPath = ref<string | null>(null)
  let _pendingContent: string | null = null
  let _pendingFilename = ''

  async function prepareExport() {
    status.value = 'loading'
    error.value = null
    _pendingContent = null

    try {
      const auth = getFirebaseAuth()
      const user = auth.currentUser
      if (!user) throw new Error('Not authenticated')

      const db = getFirebaseDb()
      const userId = user.uid
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

      const [profileSnap, subsSnap, txSnap, catSnap, bankSnap] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDocs(query(collection(db, 'subscriptions'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'transactions'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'categories'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'bankConnections'), where('userId', '==', userId))),
      ])

      const sections: string[] = []

      if (profileSnap.exists()) {
        const profile = flattenRecord({ id: userId, ...profileSnap.data() } as Record<string, unknown>)
        delete profile['plaidAccounts']
        sections.push('=== PROFILE ===\n' + toCSV([profile]))
      }

      if (!subsSnap.empty) {
        const rows = subsSnap.docs.map(d => flattenRecord({ id: d.id, ...d.data() } as Record<string, unknown>))
        sections.push('=== SUBSCRIPTIONS ===\n' + toCSV(rows))
      }

      if (!txSnap.empty) {
        const rows = txSnap.docs.map(d => flattenRecord({ id: d.id, ...d.data() } as Record<string, unknown>))
        sections.push('=== TRANSACTIONS ===\n' + toCSV(rows))
      }

      if (!catSnap.empty) {
        const rows = catSnap.docs.map(d => flattenRecord({ id: d.id, ...d.data() } as Record<string, unknown>))
        sections.push('=== CATEGORIES ===\n' + toCSV(rows))
      }

      if (!bankSnap.empty) {
        const rows = bankSnap.docs.map(d => {
          const data = d.data() as Record<string, unknown>
          delete data['accessToken']
          delete data['publicToken']
          return flattenRecord({ id: d.id, ...data })
        })
        sections.push('=== BANK CONNECTIONS ===\n' + toCSV(rows))
      }

      _pendingContent =
        `2Subscribe Data Export\nExported: ${new Date().toISOString()}\nUser: ${user.email}\n\n` +
        sections.join('\n\n')
      _pendingFilename = `2subscribe_data_export_${timestamp}.csv`
      status.value = 'ready'
    } catch (e) {
      console.error('[DataExport] prepare error:', e)
      error.value = e instanceof Error ? e.message : 'Export failed'
      status.value = 'error'
    }
  }

  async function triggerDownload() {
    if (!_pendingContent || !_pendingFilename) return
    error.value = null

    const blob = new Blob([_pendingContent], { type: 'text/csv;charset=utf-8;' })

    try {
      if (Capacitor.isNativePlatform()) {
        // Native Android "Save to..." dialog via ACTION_CREATE_DOCUMENT
        await FileSaver.saveFile({ filename: _pendingFilename, content: _pendingContent })
        status.value = 'saved'
        return
      }

      // Web browser: File System Access API (HTTPS) or blob URL fallback
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: _pendingFilename,
          types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = _pendingFilename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
      }
      status.value = 'saved'
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'CANCELLED') return
      console.error('[Export] error:', e)
      error.value = e instanceof Error ? e.message : 'Save failed'
    }
  }

  return { prepareExport, triggerDownload, status, error, savedPath }
}
