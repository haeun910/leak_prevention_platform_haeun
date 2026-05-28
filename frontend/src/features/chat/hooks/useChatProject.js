import { useState, useEffect } from 'react';
import { useModal } from '../../../components/AppModal';
import api from '../../../api/client';
import { labelEntityType } from '../../../utils/entityLabels';

const mapApiMessage = (message) => ({
  id: message.id,
  role: message.role,
  text: message.content,
  timestamp: message.timestamp,
  wasMasked: message.was_masked,
  isSanitized: true,
  entities: message.entities || [],
  riskLevel: message.risk_level || 'none',
  detectedItems: [...new Set((message.entities || []).map((item) => labelEntityType(item.entity_type)))],
});

const mapApiProject = (project) => ({
  id: project.id,
  name: project.name,
  color: project.color || '#667eea',
  description: project.description || '',
  instructions: project.instructions || '',
  createdAt: project.created_at,
  updatedAt: project.updated_at,
});

// =====================================================
// useChatProject 커스텀 훅
//
// 역할:
//   ChatPage와 ProjectPage 양쪽에서 완전히 동일하게 중복되던
//   chats / projects 상태 관리 로직을 한 곳으로 통합
//
//   포함 내용:
//   1) DB API → 상태 초기 복원
//   2) 두 페이지에서 공통으로 쓰이는 채팅 / 프로젝트 조작 함수
//
// 반환값:
//   chats, setChats          — 채팅 목록과 직접 업데이트 함수
//   projects, setProjects    — 프로젝트 목록과 직접 업데이트 함수
//   isDataLoaded             — localStorage 복원 완료 여부
//                              각 페이지에서 초기 UI 상태(currentChatId 등)를
//                              설정할 타이밍을 알기 위해 사용
//   deleteChat(chatId)       — 채팅 삭제, 삭제 실행 여부를 boolean으로 반환
//                              ChatPage는 반환값으로 currentChatId 갱신 여부를 판단
//   renameChat(chatId)       — 이름 변경 (prompt 다이얼로그)
//   addChatToProject(chatId, projectId) — 채팅을 프로젝트에 연결 / 해제 (null이면 미분류)
//   deleteProject(projectId) — 프로젝트 삭제 + 소속 채팅 미분류 이동
//                              삭제 실행 여부를 boolean으로 반환
//                              ProjectPage는 반환값으로 navigate 여부를 판단
// =====================================================
export function useChatProject(userEmail) {
  const { showConfirm, showPrompt } = useModal();

  const [chats, setChats] = useState([]);
  const [projects, setProjects] = useState([]);

  // 마운트 직후 빈 배열이 기존 데이터를 덮어쓰는 것을 방지하는 플래그
  // true가 되기 전까지 자동 저장 effect가 실행되지 않음
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // ── 초기 로드 ──
  // userEmail이 바뀌면 해당 사용자 데이터로 재로드
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [{ data: conversationData }, { data: projectData }] = await Promise.all([
          api.get('/mask/conversations'),
          api.get('/mask/projects'),
        ]);
        if (!isMounted) return;
        setProjects(projectData.map(mapApiProject));
        setChats(conversationData.map((chat) => ({
          id: chat.id,
          title: chat.title || '새 채팅',
          messages: [],
          projectId: chat.project_id || null,
          createdAt: chat.updated_at,
          updatedAt: chat.updated_at,
        })));
      } catch {
        setChats([]);
        setProjects([]);
      } finally {
        if (isMounted) setIsDataLoaded(true);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userEmail]);

  // ── 채팅 삭제 ──
  // async: 커스텀 confirm 모달을 await한 후 삭제 실행
  // 삭제가 실행됐는지 boolean으로 반환 (ChatPage에서 currentChatId 갱신 여부 판단에 사용)
  const deleteChat = async (chatId) => {
    const ok = await showConfirm('채팅을 삭제하시겠습니까?');
    if (!ok) return false;
    try {
      await api.delete(`/mask/conversations/${chatId}`);
    } catch (err) {
      console.error('채팅 삭제 실패:', err);
    }
    setChats(prev => prev.filter(c => c.id !== chatId));
    return true;
  };

  const loadChatMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/mask/conversations/${chatId}/messages`);
      if (!data.length) return;
      setChats(prev => prev.map(chat => (
        chat.id === chatId
          ? {
              ...chat,
              messages: data.map(mapApiMessage),
            }
          : chat
      )));
    } catch (err) {
      console.error('메시지 로드 실패:', err);
    }
  };

  // ── 채팅 이름 변경 ──
  // async: 커스텀 prompt 모달로 새 이름을 입력받은 후 업데이트
  const renameChat = async (chatId) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const newTitle = await showPrompt('새 이름을 입력하세요.', chat.title);
    if (newTitle) {
      setChats(prev => prev.map(c =>
        c.id === chatId
          ? { ...c, title: newTitle, updatedAt: new Date().toISOString() }
          : c
      ));
    }
  };

  // ── 채팅을 프로젝트에 추가 / 제거 ──
  // projectId가 null이면 미분류(분류되지 않음)로 이동
  const createProject = async (projectData) => {
    const { data } = await api.post('/mask/projects', {
      id: crypto.randomUUID(),
      ...projectData,
    });
    const project = mapApiProject(data);
    setProjects(prev => [project, ...prev]);
    return project;
  };

  const updateProject = async (projectId, projectData) => {
    const { data } = await api.post('/mask/projects', {
      id: projectId,
      ...projectData,
    });
    const project = mapApiProject(data);
    setProjects(prev => prev.map(p => (p.id === projectId ? project : p)));
    return project;
  };

  const addChatToProject = async (chatId, projectId) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      try {
        await api.post(`/mask/conversations/${chatId}/messages`, {
          title: chat.title,
          project_id: projectId,
          messages: [],
        });
      } catch (err) {
        console.error('채팅 프로젝트 이동 실패:', err);
      }
    }
    setChats(prev => prev.map(c =>
      c.id === chatId
        ? { ...c, projectId, updatedAt: new Date().toISOString() }
        : c
    ));
  };

  // ── 프로젝트 삭제 ──
  // async: 커스텀 confirm 모달을 await한 후 삭제 + 소속 채팅 미분류 이동
  // 삭제가 실행됐는지 boolean으로 반환
  // ProjectPage에서는 반환값으로 현재 프로젝트가 삭제된 경우 /chat으로 navigate
  const deleteProject = async (targetProjectId) => {
    const ok = await showConfirm('프로젝트를 삭제하시겠습니까?\n(채팅은 "분류되지 않음"으로 이동됩니다)');
    if (!ok) return false;
    try {
      await api.delete(`/mask/projects/${targetProjectId}`);
    } catch (err) {
      console.error('프로젝트 삭제 실패:', err);
      return false;
    }
    setProjects(prev => prev.filter(p => p.id !== targetProjectId));
    setChats(prev => prev.map(c =>
      c.projectId === targetProjectId
        ? { ...c, projectId: null, updatedAt: new Date().toISOString() }
        : c
    ));
    return true;
  };

  return {
    chats, setChats,
    projects, setProjects,
    isDataLoaded,
    deleteChat,
    loadChatMessages,
    renameChat,
    createProject,
    updateProject,
    addChatToProject,
    deleteProject,
  };
}
