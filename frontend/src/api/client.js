import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// 요청마다 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const stored = JSON.parse(sessionStorage.getItem('auth-Storage') || localStorage.getItem('auth-Storage') || '{}')
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
      sessionStorage.removeItem('auth-Storage')
      sessionStorage.removeItem('userInfo')
      localStorage.removeItem('auth-Storage')
      localStorage.removeItem('userInfo')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const register = (data) => api.post('/auth/register', data)
export const getDepartments = () => api.get('/auth/departments')
export const submitContactInquiry = (data) => api.post('/contact/inquiries', data)

// Masking / Chat
export const sendChat = (data) => api.post('/mask/chat', data)
export const previewMask = (data) => api.post('/mask/preview', data)
export const getPreferences = () => api.get('/mask/preferences')
export const savePreferences = (data) => api.post('/mask/preferences', data)
export const submitDepartmentChangeRequest = (data) => api.post('/mask/department-change-requests', data)

// Prompt Templates
export const getTemplates = () => api.get('/mask/templates')
export const createTemplate = (data) => api.post('/mask/templates', data)
export const updateTemplate = (id, data) => api.patch(`/mask/templates/${id}`, data)
export const deleteTemplate = (id) => api.delete(`/mask/templates/${id}`)

// Admin
export const getStats = () => api.get('/admin/stats')
export const getLogs = (params) => api.get('/admin/logs', { params })

export default api
