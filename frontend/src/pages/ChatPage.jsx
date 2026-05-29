import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from '../features/chat/components/sidebar/Sidebar';
import MessageBubble from '../features/chat/components/window/MessageBubble';
import InputBox from '../features/chat/components/input/InputBox';
import ProjectModal from '../features/chat/components/sidebar/ProjectModal';
import TemplatePanel from '../features/chat/components/template/TemplatePanel';
import { useChatProject } from '../features/chat/hooks/useChatProject';
import { generateChatTitle } from '../features/chat/utils/generateChatTitle';
import api, { previewMask, sendChat, getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/client';
import { labelEntityType } from '../utils/entityLabels';
import './ChatPage.css';

// =====================================================
// ChatPage 컴포넌트
// 역할:
// 1) 사용자와 메시지 UI 전체를 관리하는 최상위 컴포넌트
// 2) 메시지 목록, 현재 채팅, 프로젝트 상태를 전역에서 관리
// 3) localStorage를 대신 DB로 사용 (추후 동기화 예정)
// 4) 채팅/프로젝트 CRUD 핸들러를 하위 컴포넌트에 props로 전달
// =====================================================
function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인한 사용자 정보 (렌더링 기준 최초 한 번만 실행)
  // userEmail은 실제 사용자의 사용자명으로 채팅/프로젝트를 구분하는 키
  // 컴포넌트 초기화 시 sessionStorage의 userInfo를 파싱하지 않으면 불필요한 리렌더링 발생
  const userInfo = useMemo(
    () => JSON.parse(sessionStorage.getItem('userInfo') || '{}'),
    []
  );
  const userEmail = userInfo.email || 'guest';
  const { chatId: urlChatId } = useParams();

  // ===== 공통 상태 관리: useChatProject hook =====
  // chats / projects 로딩과 CRUD 로직을 hook으로 분리
  // (이전 버전 삭제: ProjectPage와 동일한 hook 사용)
  const {
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
  } = useChatProject(userEmail);

  // ===== 이 페이지 전용 State =====
  const [currentChatId, setCurrentChatId] = useState(null); // 현재 선택된 채팅 ID
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);// 프로젝트 모달 열림 여부
  const [editingProject, setEditingProject] = useState(null); // 수정 중인 프로젝트 (null이면 새 생성)
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmProvider, setLlmProvider] = useState('openai');

  // ===== 템플릿 패널 상태 =====
  const [templatePanelOpen, setTemplatePanelOpen] = useState(false);
  const [userTemplates, setUserTemplates] = useState([]);
  // 템플릿 삽입 시 InputBox textarea에 포커스 이동시키는 트리거
  const [inputFocusTrigger, setInputFocusTrigger] = useState(0);

  // 로그인된 사용자의 개인 템플릿을 서버에서 불러옴
  // 실패해도 시스템 템플릿은 계속 작동하므로 조용히 처리
  useEffect(() => {
    if (!userEmail || userEmail === 'guest') return;
    getTemplates()
      .then((res) => setUserTemplates(res.data))
      .catch(() => {});
  }, [userEmail]);


  // 메시지 목록 맨 아래를 가리키는 ref (자동 스크롤용)
  const messagesEndRef = useRef(null);

  // ===== 초기 currentChatId 설정 =====
  // hook의 isDataLoaded가 true가 되는 시점 이후 최초 한 번 실행
  // - ProjectPage에서 navigate('/chat', { state: { chatId } })로 넘어온 경우 해당 채팅 선택
  // - 그냥 직접 접속한 경우 기존 채팅을 자동 선택하지 않고 새 메시지 화면 표시
  useEffect(() => {
    if (!isDataLoaded) return;
    if (currentChatId) return;

    const targetChatId = urlChatId || location.state?.chatId;
    if (!targetChatId) return;

    if (!chats.some(chat => chat.id === targetChatId)) {
      setChats(prev => [{
        id: targetChatId,
        title: '새 채팅',
        messages: [],
        projectId: location.state?.projectId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, ...prev]);
    }

    setCurrentChatId(targetChatId);
    const selected = chats.find(chat => chat.id === targetChatId);
    if (!selected || selected.messages.length === 0) {
      loadChatMessages(targetChatId);
    }
  }, [isDataLoaded, chats, currentChatId, location.state?.chatId, loadChatMessages]);

  // ===== 자동 스크롤 =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId]);

  // ===== 새 채팅 버튼 =====
  // 사이드바의 "새 채팅" 버튼 클릭 시 새 채팅 객체 생성 후 이동
  const handleNewChat = () => {
    const newChat = {
    // [버그 수정] Date.now() 대신 crypto.randomUUID() 사용
    // Date.now()는 밀리초 기준으로 동일 시간에 다른 값의 충돌 가능성 있음
      id: crypto.randomUUID(),
      title: '새 채팅',
      messages: [],
      projectId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  // ===== 채팅 선택 =====
  const handleSelectChat = (chatId) => {
    navigate(`/chat/${chatId}`);
    setCurrentChatId(chatId);
    const selected = chats.find(chat => chat.id === chatId);
    if (selected && selected.messages.length === 0) {
      loadChatMessages(chatId);
    }
  };

  // ===== 채팅 삭제 =====
  // hook의 deleteChat으로 삭제 후, 삭제된 채팅이 현재 선택 중이라면 currentChatId를 초기화
  // (currentChatId 초기화는 이 페이지에서만 필요한 동작이라 hook 외부에서 처리)
  // deleteChat은 async이므로 await 필요
  const handleDeleteChat = async (chatId) => {
    const deleted = await deleteChat(chatId);
    if (deleted && currentChatId === chatId) {
      const remaining = chats.filter(c => c.id !== chatId);
      setCurrentChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // handleRenameChat → hook의 renameChat 직접 사용 (Sidebar에 prop으로 전달)
  // handleAddChatToProject → hook의 addChatToProject 직접 사용
 
  // ===== AI 응답 요청 (공통 함수) =====
  // 역할: AI 응답 메시지를 생성해 지정된 채팅에 추가
  // - handleSend / handleEditMessage 양쪽에서 호출됨 (중복 코드 제거)
  // - 추후 동기화 시에는 setTimeout 없이 API 호출로 교체하면 됨
  //
  // 파라미터:
  //   targetChatId  → 응답을 추가할 채팅 ID
  //                   (setTimeout 이후에도 정확한 채팅에 추가되도록 호출 시점에서 캡처)
  //   chatTitle     → 새 채팅 제목을 이때 업데이트할 때 사용 (첫 메시지 전송 시에만 전달)
  //                   null이면 기존 제목 그대로 유지
  const saveConversation = async (targetChatId, title, messages) => {
    const safeMessages = messages.filter((message) => (
      message.role !== 'user' || message.isSanitized
    ));
    if (!safeMessages.length) return;

    try {
      const targetChat = chats.find(chat => chat.id === targetChatId);
      const projectId = targetChat?.projectId || (
        location.state?.chatId === targetChatId ? location.state?.projectId : null
      );
      await api.post(`/mask/conversations/${targetChatId}/messages`, {
        title,
        project_id: projectId || null,
        messages: safeMessages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.text,
          was_masked: Boolean(message.wasMasked),
          entities: message.entities || [],
          risk_level: message.riskLevel || 'none',
        })),
      });
    } catch (err) {
      console.error('채팅 저장 실패:', err);
    }
  };

  const applyPreviewMask = async (targetChatId, originalText, userMessageId) => {
    try {
      const { data } = await previewMask({
        text: originalText,
        session_id: targetChatId,
      });
      const detectedItems = [...new Set((data.detected_entities || []).map((item) => labelEntityType(item.entity_type)))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.masked_text,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
        isSanitized: true,
        detectedItems,
        entities: data.detected_entities || [],
        riskLevel: data.overall_risk || 'none',
      };

      setChats(prev => prev.map(chat => (
        chat.id === targetChatId
          ? {
              ...chat,
              messages: chat.messages.map((message) => (
                message.id === userMessageId ? maskedUserMessage : message
              )),
              updatedAt: new Date().toISOString(),
            }
          : chat
      )));

      return maskedUserMessage;
    } catch (err) {
      console.error('마스킹 미리보기 실패', err);
      return null;
    }
  };

  const requestAIResponse = async (targetChatId, originalText, userMessageId, chatTitle = null) => {
    const previewUserMessage = await applyPreviewMask(targetChatId, originalText, userMessageId);
    const existingTitle = chats.find(chat => chat.id === targetChatId)?.title;
    const conversationTitle = chatTitle // 마스킹이 된 텍스트로 보이도록 변경
      ? generateChatTitle(previewUserMessage?.text || originalText)
      : existingTitle || generateChatTitle(originalText);

    if (previewUserMessage) {
      await saveConversation(targetChatId, conversationTitle, [previewUserMessage]);
    }

    try {
      const { data } = await sendChat({
        text: originalText,
        session_id: targetChatId,
        provider: llmProvider,
      });

      const detectedItems = [...new Set((data.detected_entities || []).map((item) => labelEntityType(item.entity_type)))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.question,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
        isSanitized: true,
        detectedItems,
        entities: data.detected_entities || [],
        riskLevel: data.overall_risk || 'none',
      };

      const aiMessage = {
        id: crypto.randomUUID(),
        text: data.answer,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        riskLevel: data.overall_risk || 'none',
      };

      setChats(prev => prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const nextTitle = chatTitle !== null ? conversationTitle : chat.title;
        const nextMessages = chat.messages
          .map((message) => (message.id === userMessageId ? maskedUserMessage : message))
          .concat(aiMessage);
        void saveConversation(targetChatId, nextTitle || conversationTitle, nextMessages);
        return {
          ...chat,
          messages: nextMessages,
          title: nextTitle,
          updatedAt: new Date().toISOString(),
        };
      }));
    } catch (err) {
      const aiMessage = {
        id: crypto.randomUUID(),
        text: err.response?.data?.detail || '서버 응답 처리 중 오류가 발생했습니다.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setChats(prev => prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const nextMessages = [
          ...chat.messages.map((message) => (
            message.id === userMessageId && previewUserMessage ? previewUserMessage : message
          )),
          aiMessage,
        ];
        void saveConversation(targetChatId, chatTitle || chat.title || conversationTitle, nextMessages);
        return {
          ...chat,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 메시지 전송 =====
  // 역할:
  // 1) 빈 화면(채팅 없는 상태)에서 전송하면 새 채팅 자동 생성
  // 2) 기존 채팅에서 전송하면 해당 채팅에 메시지 추가
  // 3) 첫 번째 메시지 전송 시 AI 응답과 채팅 제목 자동 생성
  const handleSend = () => {
    // [버그 수정] isLoading 상태 추가
    // InputBox 자체(버튼 disabled, Enter 이벤트)에서도 막지만
    // handleSend 자체에서도 이중으로 막아 여러 번 호출 시에도 중복 전송 방지
    if (!inputText.trim() || isLoading) return;

    // 입력값을 빠르게 캡처해 UX 지연 없도록 (capturedInput에 원본 저장)
    const capturedInput = inputText;
    setInputText('');

    // 현재 채팅이 없으면 새 채팅을 만들어서 진행
    let targetChatId = currentChatId;
    let isFirstMessage = false;

    if (!targetChatId) {
      // 빈 화면에서 첫 전송: 새 채팅 생성
      // [버그 수정] Date.now() → crypto.randomUUID()
      // Date.now()는 밀리초 기준으로 동일 시간에 호출 시 userMessage.id와
      // 동일한 값이 생성되는 충돌이 발생할 수 있음
      // crypto.randomUUID()는 RFC 4122 기반 전역 고유 ID를 보장
      const newChatId = crypto.randomUUID();
      const newChat = {
        id: newChatId,
        title: '새 채팅',
        messages: [],
        projectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
      targetChatId = newChatId;
      isFirstMessage = true;
    } else {
      // 기존 채팅: 메시지가 없거나 비어있는 경우에만 첫 메시지로 처리
      const existingChat = chats.find(c => c.id === targetChatId);
      isFirstMessage = (existingChat?.messages?.length ?? 0) === 0;
    }

    // 사용자 메시지 객체 생성
    const userMessage = {
      // [버그 수정] 고유 ID 보장을 위해 crypto.randomUUID() 사용
      id: crypto.randomUUID(),
      text: capturedInput,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setIsLoading(true);

     // 사용자 메시지를 채팅에 추가
    setChats(prev => prev.map(chat =>
      chat.id === targetChatId
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: new Date().toISOString(),
          }
        : chat
    ));

    // 첫 번째 메시지라면 자동 생성 제목을 전달, 이후 메시지는 null (기존 제목 유지) 
    requestAIResponse(
      targetChatId,
      capturedInput,
      userMessage.id,
      isFirstMessage ? generateChatTitle(capturedInput) : null
    );
  };

  // ===== 메시지 수정 =====
  // 역할:
  // 1) 수정된 메시지 이후의 모든 메시지 삭제 (대화 흐름 초기화)
  // 2) 수정된 텍스트로 해당 메시지 업데이트
  // 3) 수정된 내용 기준으로 AI 재응답을 생성
  const handleEditMessage = (messageId, newText) => {
    if (!newText.trim()) return;

    const capturedText = newText.trim();
    // currentChatId를 미리 캡처
    // setTimeout 실행 이후에 사용자가 다른 채팅으로 이동해도
    // AI 응답은 정확한 채팅에 추가되도록 보장
    const capturedChatId = currentChatId;
    setIsLoading(true);

    setChats(prev => prev.map(chat => {
      if (chat.id !== capturedChatId) return chat;

      // 수정된 메시지의 인덱스 확인
      const editedIndex = chat.messages.findIndex(msg => msg.id === messageId);
      if (editedIndex === -1) return chat;

      // 수정된 메시지 이전까지 남기고, 이후 메시지를 모두 삭제
      const trimmedMessages = chat.messages
        .slice(0, editedIndex + 1)
        .map(msg =>
          msg.id === messageId
            ? { ...msg, text: capturedText, editedAt: new Date().toISOString() }
            : msg
        );

      return {
        ...chat,
        messages: trimmedMessages,
        updatedAt: new Date().toISOString(),
      };
    }));

    // 메시지 수정 이후에는 제목 변경 없이 AI 재응답만 요청
    requestAIResponse(capturedChatId, capturedText, messageId);
  };

  // ===== 프로젝트 생성 =====
  // ProjectModal의 onSave 콜백 형식: (projectId, projectData)
  const handleCreateProject = (_projectId, projectData) => {
    const newProject = {
      // [버그 수정] 프로젝트 ID의 고유 보장을 위해 crypto.randomUUID() 사용
      id: crypto.randomUUID(),
      name: projectData.name,
      color: projectData.color || '#667eea',
      description: projectData.description || '',
      instructions: projectData.instructions || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProjects(prev => [...prev, newProject]);
    setIsProjectModalOpen(false);
  };

  // ===== 프로젝트 수정 =====
  const handleUpdateProject = (projectId, projectData) => {
    setProjects(prev => prev.map(proj =>
      proj.id === projectId
        ? {
            ...proj,
            name: projectData.name,
            color: projectData.color,
            description: projectData.description,
            instructions: projectData.instructions,
            updatedAt: new Date().toISOString(),
          }
        : proj
    ));
    setEditingProject(null);
    setIsProjectModalOpen(false);
  };

  // handleDeleteProject → hook의 deleteProject 직접 사용 (아래 Sidebar props 참고)
  // handleAddChatToProject → hook의 addChatToProject 직접 사용

  // ===== 프로젝트 페이지로 이동 =====
  const handleSelectProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  // ===== 프로젝트 모달 열기 (수정) =====
  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  // ===== 템플릿 CRUD 핸들러 =====

  // 새 템플릿 생성: 서버에 저장 후 로컬 상태에도 추가
  // 실패 시 예외를 그대로 throw → TemplateFormModal에서 에러 메시지 표시
  const handleCreateTemplate = async (data) => {
    const { data: created } = await createTemplate(data);
    setUserTemplates((prev) => [created, ...prev]);
  };

  // 기존 템플릿 수정: 서버 업데이트 후 로컬 상태 반영
  const handleUpdateTemplate = async (id, data) => {
    const { data: updated } = await updateTemplate(id, data);
    setUserTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  // 템플릿 삭제: 서버에서 제거 후 로컬 상태에서도 제거
  const handleDeleteTemplate = async (id) => {
    await deleteTemplate(id);
    setUserTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // 템플릿 클릭 시 입력창에 내용 삽입
  const handleInsertTemplate = (content) => {
    setInputText(content);
    // 텍스트 삽입 직후 textarea에 자동 포커스 (InputBox의 focusTrigger useEffect 트리거)
    setInputFocusTrigger((v) => v + 1);
  };

  // ===== 프로젝트 모달 열기 (새 생성) =====
  const handleNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleCreateProjectDb = async (_projectId, projectData) => {
    try {
      await createProject(projectData);
      setIsProjectModalOpen(false);
    } catch (err) {
      console.error('프로젝트 생성 실패:', err);
    }
  };

  const handleUpdateProjectDb = async (projectId, projectData) => {
    try {
      await updateProject(projectId, projectData);
      setEditingProject(null);
      setIsProjectModalOpen(false);
    } catch (err) {
      console.error('프로젝트 수정 실패:', err);
    }
  };

  const currentChat = chats.find(chat => chat.id === currentChatId);

  return (
    <div className="chat-page">
      {/* 왼쪽 사이드바: 채팅 목록 + 프로젝트 목록 + 사용자 정보 */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        projects={projects}
        selectedProjectId={null}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={renameChat}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={deleteProject}
        onAddChatToProject={addChatToProject}
      />

      {/* 오른쪽 채팅 영역 */}
      <div className="chat-area">
        <div className="chat-container">
          {currentChat ? (
            /* 채팅이 선택된 상태: 메시지 목록 + 입력창 */
            <>
              <div className="messages-container">
                {currentChat.messages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onEditMessage={handleEditMessage}
                  />
                ))}
                {isLoading && (
                  <div className="assistant-loading-row" aria-label="답변 생성 중">
                    <span className="assistant-loading-spinner" />
                  </div>
                )}
                {/* 자동 스크롤 기준점 - 항상 메시지 목록 맨 아래에 위치 */}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-section">
                <InputBox
                  inputText={inputText}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  isLoading={isLoading}
                  llmProvider={llmProvider}
                  onChangeLlmProvider={setLlmProvider}
                  onToggleTemplates={() => setTemplatePanelOpen((v) => !v)}
                  templatesOpen={templatePanelOpen}
                  focusTrigger={inputFocusTrigger}
                />
              </div>
            </>
          ) : (
            /* 채팅이 없는 상태: 홈 화면 (입력 시 새 채팅 자동 생성) */
            <div className="home-screen">
              <div className="home-welcome">
                <h1 className="home-title">무엇을 도와드릴까요?</h1>
                <p className="home-subtitle">
                  입력하신 민감정보는 자동으로 마스킹되어 안전하게 처리됩니다.
                </p>
              </div>
              <div className="home-input-section">
                <InputBox
                  inputText={inputText}
                  onInputChange={setInputText}
                  onSend={handleSend}
                  isLoading={isLoading}
                  llmProvider={llmProvider}
                  onChangeLlmProvider={setLlmProvider}
                  onToggleTemplates={() => setTemplatePanelOpen((v) => !v)}
                  templatesOpen={templatePanelOpen}
                  focusTrigger={inputFocusTrigger}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 템플릿 패널 - templatePanelOpen 일 때만 렌더링 */}
      {templatePanelOpen && (
        <TemplatePanel
          onInsert={handleInsertTemplate}
          onClose={() => setTemplatePanelOpen(false)}
          userTemplates={userTemplates}
          onCreateTemplate={handleCreateTemplate}
          onUpdateTemplate={handleUpdateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}


      {/* 프로젝트 생성 / 수정 모달 */}
      {isProjectModalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={editingProject ? handleUpdateProjectDb : handleCreateProjectDb}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}

export default ChatPage;
