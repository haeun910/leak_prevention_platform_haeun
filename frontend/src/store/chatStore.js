import { create } from 'zustand'
import api from '../api/client'  

const API = '/mask'

let convIdCounter = 0
const newConvId = () => `conv_${++convIdCounter}`

function createConversation() {
  return { id: newConvId(), title: '', messages: [], projectId: null }
}

const useChatStore = create((set, get) => ({
  conversations: [],
  currentId: null,
  projects: [],
  loaded: false,

  // DB에서 대화 목록 로드 (로그인 후 최초 1회)
  loadConversations: async () => {
    try {
      const { data } = await api.get(`${API}/conversations`)
      if (data.length === 0) {
        const first = createConversation()
        set({ conversations: [first], currentId: first.id, loaded: true })
      } else {
        // messages: [] 추가
        const convs = data.map(c => ({ ...c, messages: [] }))
        set({ conversations: convs, currentId: convs[0].id, loaded: true })
      }
    } catch {
      const first = createConversation()
      set({ conversations: [first], currentId: first.id, loaded: true })
    }
  },
  // 특정 대화 메시지 로드
  loadMessages: async (convId) => {
    try {
      const { data } = await api.get(`${API}/conversations/${convId}/messages`)
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === convId ? { ...c, messages: data } : c
        ),
      }))
    } catch (e) {
      console.error('메시지 로드 실패', e)
    }
  },

  // 현재 대화 객체 반환
  getCurrentConv: () => {
    const { conversations, currentId } = get()
    return conversations.find(c => c.id === currentId) || conversations[0]
  },

  // 특정 대화 업데이트 + DB 저장
    updateConv: (id, updater) => {
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, ...updater(c) } : c
        ),
      }))
      // DB에 저장
      const updated = get().conversations.find(c => c.id === id)
      if (updated) {
        api.post(`${API}/conversations/${id}/messages`, {
          title: updated.title,
          messages: updated.messages,
        }).catch(e => console.error('채팅 저장 실패', e))
      }
    },

  // 현재 대화 ID 변경 + 메시지 로드
  setCurrentId: (id) => {
    set({ currentId: id })
    const conv = get().conversations.find(c => c.id === id)
    if (conv && conv.messages.length === 0) {
      get().loadMessages(id)
    }
  },

  // 새 대화 생성
  createConv: () => {
    const conv = createConversation()
    set(state => ({
      conversations: [conv, ...state.conversations],
      currentId: conv.id,
    }))
  },

  // 대화 삭제
  deleteConv: async (id) => {
    try {
      await api.delete(`${API}/conversations/${id}`)
    } catch (e) {
      console.error('대화 삭제 실패', e)
    }
    set(state => {
      const next = state.conversations.filter(c => c.id !== id)
      const newList = next.length > 0 ? next : [createConversation()]
      return {
        conversations: newList,
        currentId: state.currentId === id ? newList[0].id : state.currentId,
      }
    })
  },

// 프로젝트 생성
createProject: (name) => {
  const id = `proj_${Date.now()}`
  set(state => ({
    projects: [...state.projects, { id, name }],
  }))
},

initCurrentId: () => {}, // 하위 호환용
}))

export default useChatStore