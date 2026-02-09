import axios, { type AxiosInstance } from 'axios'
import { auth } from '@/lib/firebase'

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const user = auth.currentUser
        if (user) {
          const token = await user.getIdToken()
          config.headers.Authorization = `Bearer ${token}`
          console.log('🔑 API Request:', config.method?.toUpperCase(), config.url)
        } else {
          console.warn('⚠️ No authenticated user for API request')
        }
        return config
      },
      (error) => {
        console.error('❌ Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.config.url, response.status)
        return response
      },
      (error) => {
        console.error('❌ API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          data: error.response?.data
        })
        
        if (error.response?.status === 401) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  get<T>(url: string, params?: any) {
    return this.client.get<T>(url, { params })
  }

  post<T>(url: string, data?: any) {
    return this.client.post<T>(url, data)
  }

  delete<T>(url: string) {
    return this.client.delete<T>(url)
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL + '/api/admin'
export const apiClient = new ApiClient(baseURL)
