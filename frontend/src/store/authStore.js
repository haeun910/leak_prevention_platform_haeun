import { create } from 'zustand'
import api from '../api/client'

const STORAGE_KEY = 'auth-Storage'

const useAuthStore = create((set) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { token, user } }))
    sessionStorage.setItem('userInfo', JSON.stringify({
      email: user.username,
      role: user.role,
      name: user.name,
      empId: user.username,
      department: user.department,
    }))
    set({ token, user })
  },

  logout: () => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('userInfo')
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('userInfo')
    set({ token: null, user: null })
  },

  verifyToken: async () => {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '{}')
    const token = stored?.state?.token
    if (!token) {
      set({ token: null, user: null })
      return
    }
    try {
      const { data: user } = await api.get('/auth/me')
      set({ token, user })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem('userInfo')
      set({ token: null, user: null })
    }
  },
}))

export default useAuthStore
