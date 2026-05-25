type LoggedBody =
  | unknown
  | {
      type: string
      note?: string
      size?: number
      entries?: Record<string, unknown>
    }

interface ApiFetchLog {
  id: string
  method: string
  url: string
  params: Record<string, string | string[]>
  request: {
    headers: Record<string, string>
    payload: LoggedBody
  }
  response?: {
    status: number
    statusText: string
    ok: boolean
    headers: Record<string, string>
    body: LoggedBody
    durationMs: number
  }
  error?: {
    message: string
    durationMs: number
  }
}

const INSTALL_FLAG = '__2subscribe_api_fetch_logger_installed__'
const ORIGINAL_FETCH = '__2subscribe_original_fetch__'
const SENSITIVE_HEADER_NAMES = new Set(['authorization', 'cookie', 'set-cookie'])

function serialiseHeaders(headers?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {}
  if (!headers) return result

  const source = headers instanceof Headers
    ? Array.from(headers.entries())
    : Array.isArray(headers)
      ? headers
      : Object.entries(headers)

  for (const [key, value] of source) {
    result[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? '[REDACTED]' : String(value)
  }

  return result
}

function serialiseUrl(input: RequestInfo | URL): { url: string; params: Record<string, string | string[]> } {
  const rawUrl = input instanceof Request ? input.url : String(input)
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const parsed = new URL(rawUrl, base)
  const params: Record<string, string | string[]> = {}

  parsed.searchParams.forEach((value, key) => {
    const existing = params[key]
    if (Array.isArray(existing)) {
      existing.push(value)
    } else if (existing !== undefined) {
      params[key] = [existing, value]
    } else {
      params[key] = value
    }
  })

  return { url: parsed.toString(), params }
}

function parseTextBody(text: string, contentType?: string | null): unknown {
  if (!text) return null

  const isJson = contentType?.toLowerCase().includes('json')
  if (isJson) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function serialiseRequestBody(input: RequestInfo | URL, init?: RequestInit): Promise<LoggedBody> {
  const body = init?.body

  if (body !== undefined && body !== null) {
    return serialiseBodyValue(body, init?.headers)
  }

  if (input instanceof Request && input.bodyUsed === false) {
    try {
      const clone = input.clone()
      const text = await clone.text()
      return parseTextBody(text, clone.headers.get('content-type'))
    } catch (error) {
      return {
        type: 'unreadable-request-body',
        note: error instanceof Error ? error.message : 'Unable to read request body',
      }
    }
  }

  return null
}

function serialiseBodyValue(body: BodyInit, headers?: HeadersInit): LoggedBody {
  if (typeof body === 'string') {
    const contentType = serialiseHeaders(headers)['Content-Type'] ?? serialiseHeaders(headers)['content-type']
    return parseTextBody(body, contentType)
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  if (body instanceof FormData) {
    const entries: Record<string, unknown> = {}
    body.forEach((value, key) => {
      entries[key] = value instanceof File
        ? { type: 'file', name: value.name, size: value.size, mimeType: value.type }
        : value
    })
    return { type: 'form-data', entries }
  }

  if (body instanceof Blob) {
    return { type: 'blob', size: body.size, note: body.type || undefined }
  }

  if (body instanceof ArrayBuffer) {
    return { type: 'array-buffer', size: body.byteLength }
  }

  if (ArrayBuffer.isView(body)) {
    return { type: 'array-buffer-view', size: body.byteLength }
  }

  return { type: Object.prototype.toString.call(body), note: 'Request body type is not directly printable' }
}

async function serialiseResponseBody(response: Response): Promise<LoggedBody> {
  try {
    const clone = response.clone()
    const contentType = clone.headers.get('content-type')
    const text = await clone.text()
    return parseTextBody(text, contentType)
  } catch (error) {
    return {
      type: 'unreadable-response-body',
      note: error instanceof Error ? error.message : 'Unable to read response body',
    }
  }
}

function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
}

function getRequestHeaders(input: RequestInfo | URL, init?: RequestInit): Record<string, string> {
  return {
    ...(input instanceof Request ? serialiseHeaders(input.headers) : {}),
    ...serialiseHeaders(init?.headers),
  }
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function printRequest(log: ApiFetchLog): void {
  console.log(`[API REQUEST] ${log.id} ${log.method} ${log.url}`, {
    params: log.params,
    headers: log.request.headers,
    payload: log.request.payload,
  })
}

function printResponse(log: ApiFetchLog): void {
  console.log(`[API RESPONSE] ${log.id} ${log.method} ${log.url}`, log.response)
}

function printError(log: ApiFetchLog): void {
  console.log(`[API ERROR] ${log.id} ${log.method} ${log.url}`, log.error)
}

export function installApiFetchLogger(): void {
  const globalScope = globalThis as typeof globalThis & Record<string, unknown>
  if (globalScope[INSTALL_FLAG]) return

  const originalFetch = globalThis.fetch.bind(globalThis)
  globalScope[INSTALL_FLAG] = true
  globalScope[ORIGINAL_FETCH] = originalFetch

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startedAt = performance.now()
    const { url, params } = serialiseUrl(input)
    const log: ApiFetchLog = {
      id: createRequestId(),
      method: getMethod(input, init),
      url,
      params,
      request: {
        headers: getRequestHeaders(input, init),
        payload: await serialiseRequestBody(input, init),
      },
    }

    printRequest(log)

    try {
      const response = await originalFetch(input, init)
      log.response = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: serialiseHeaders(response.headers),
        body: await serialiseResponseBody(response),
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      }
      printResponse(log)
      return response
    } catch (error) {
      log.error = {
        message: error instanceof Error ? error.message : String(error),
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      }
      printError(log)
      throw error
    }
  }
}
