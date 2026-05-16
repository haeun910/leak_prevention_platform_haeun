import { create } from 'zustand'
import api from '../api/client'

const STORAGE_KEY = 'auth-Storage'

const useAuthStore = create((set) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
    // 로그인 시 localStorage에 직접 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { token, user } }))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('auth-storage')
    set({ token: null, user: null })
  },

  verifyToken: async () => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
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
      set({ token: null, user: null })
    }
  },
}))

export default useAuthStore
