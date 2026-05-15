import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// 요청마다 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem('auth-Storage') || '{}')
  const token = stored?.state?.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 → 로그인 페이지
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = err.config?.url || ''
    const isLoginRequest = requestUrl.includes('/auth/login')
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('auth-Storage')
      localStorage.removeItem('userInfo')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getDepartments = () => api.get('/auth/departments')

// Masking / Chat
export const sendChat = (data) => api.post('/mask/chat', data)
export const previewMask = (data) => api.post('/mask/preview', data)

// Admin
export const getStats = () => api.get('/admin/stats')
export const getLogs = (params) => api.get('/admin/logs', { params })

export default api
