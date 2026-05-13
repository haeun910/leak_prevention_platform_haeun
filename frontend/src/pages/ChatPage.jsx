import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../features/chat/components/sidebar/Sidebar';
import MessageBubble from '../features/chat/components/window/MessageBubble';
import InputBox from '../features/chat/components/input/InputBox';
import ProjectModal from '../features/chat/components/sidebar/ProjectModal';
import { useChatProject } from '../features/chat/hooks/useChatProject';
import { generateChatTitle } from '../features/chat/utils/generateChatTitle';
import api, { previewMask, sendChat } from '../api/client';
import './ChatPage.css';

// =====================================================
// ChatPage 컴포넌트
// 역할:
// 1) 직원용 채팅 UI 전체를 관리하는 최상위 컴포넌트
// 2) 채팅 목록, 현재 채팅, 프로젝트 상태를 한 곳에서 관리
// 3) localStorage를 임시 DB로 사용 (백엔드 연동 전까지)
// 4) 채팅/프로젝트 CRUD 핸들러를 자식 컴포넌트에 props로 전달
// =====================================================
function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인한 사용자 정보 (마운트 시 한 번만 파싱)
  // userEmail을 키로 사용해 사용자별 채팅/프로젝트를 분리 저장
  // 컴포넌트 생존 중 localStorage의 userInfo는 변하지 않으므로 의존성 배열 비움
  const userInfo = useMemo(
    () => JSON.parse(localStorage.getItem('userInfo') || '{}'),
    []
  );
  const userEmail = userInfo.email || 'guest';

  // ===== 공유 상태 — useChatProject hook =====
  // chats / projects 로드·저장·공통 조작을 hook으로 위임
  // (중복 제거: ProjectPage도 동일한 hook 사용)
  const {
    chats, setChats,
    projects, setProjects,
    isDataLoaded,
    deleteChat,
    loadChatMessages,
    renameChat,
    addChatToProject,
    deleteProject,
  } = useChatProject(userEmail);

  // ===== 이 페이지 전용 State =====
  const [currentChatId, setCurrentChatId] = useState(null); // 현재 선택된 채팅 ID
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false); // 프로젝트 모달 열림 여부
  const [editingProject, setEditingProject] = useState(null); // 수정 중인 프로젝트 (null이면 새 생성)
  const [inputText, setInputText] = useState('');        // 입력창 텍스트
  const [isLoading, setIsLoading] = useState(false);     // AI 응답 대기 중 여부
  const [llmProvider, setLlmProvider] = useState('openai');

  // 메시지 목록 맨 아래를 가리키는 ref (자동 스크롤용)
  const messagesEndRef = useRef(null);

  // ===== 초기 currentChatId 설정 =====
  // hook의 isDataLoaded가 true가 되는 순간 한 번만 실행
  // - ProjectPage에서 navigate('/chat', { state: { chatId } })로 넘어온 경우 해당 채팅 선택
  // - 일반 진입의 경우 가장 첫 번째 채팅(최근 수정 순) 선택
  useEffect(() => {
    if (!isDataLoaded) return;
    if (location.state?.chatId) {
      setCurrentChatId(location.state.chatId);
      loadChatMessages(location.state.chatId);
    } else {
      setCurrentChatId(null);
    }
  // isDataLoaded가 true로 바뀌는 시점에만 실행하면 되므로 의존성을 isDataLoaded로 한정
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]);

  // ===== 자동 스크롤 =====
  // chats 또는 currentChatId가 바뀔 때마다 메시지 목록 맨 아래로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, currentChatId]);

  // ===== 새 채팅 버튼 =====
  // 사이드바의 "새 채팅" 버튼 클릭 시 빈 채팅 생성 후 이동
  const handleNewChat = () => {
    const newChat = {
      // [버그 수정] Date.now() 대신 crypto.randomUUID() 사용
      // Date.now()는 밀리초 단위로 동일 틱에 충돌 가능성 있음
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
    setCurrentChatId(chatId);
    const selected = chats.find(chat => chat.id === chatId);
    if (selected && selected.messages.length === 0) {
      loadChatMessages(chatId);
    }
  };

  // ===== 채팅 삭제 =====
  // hook의 deleteChat으로 삭제 후, 삭제된 채팅이 현재 선택 중이었다면 currentChatId도 갱신
  // (currentChatId 갱신은 이 페이지에만 있는 로직이라 hook 밖에서 처리)
  // deleteChat이 async이므로 await 필요
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
  // - handleSend / handleEditMessage 양쪽에서 호출해 중복 코드 제거
  // - 백엔드 연동 시 이 함수의 setTimeout 부분만 API 호출로 교체하면 됨
  //
  // 파라미터:
  //   targetChatId — 응답을 추가할 채팅 ID
  //                  (setTimeout 이후에도 정확한 채팅에 추가되도록 호출 시점에 캡처해서 전달)
  //   chatTitle    — 채팅 제목을 함께 갱신할 때 사용 (첫 메시지 전송 시에만 전달)
  //                  null이면 기존 제목 그대로 유지
  const saveConversation = async (targetChatId, title, messages) => {
    try {
      await api.post(`/mask/conversations/${targetChatId}/messages`, {
        title,
        messages: messages.map((message) => ({
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
      const detectedItems = [...new Set((data.detected_entities || []).map((item) => item.entity_type))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.masked_text,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
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
      console.error('마스킹 미리보기 실패:', err);
      return null;
    }
  };

  const requestAIResponse = async (targetChatId, originalText, userMessageId, chatTitle = null) => {
    const previewUserMessage = await applyPreviewMask(targetChatId, originalText, userMessageId);

    try {
      const { data } = await sendChat({
        text: originalText,
        session_id: targetChatId,
        provider: llmProvider,
      });

      const detectedItems = [...new Set((data.detected_entities || []).map((item) => item.entity_type))];
      const maskedUserMessage = {
        id: userMessageId,
        text: data.question,
        role: 'user',
        timestamp: new Date().toISOString(),
        wasMasked: data.was_masked,
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

      let savedTitle = chatTitle;
      let savedMessages = [];
      setChats(prev => prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const nextTitle = chatTitle !== null ? chatTitle : chat.title;
        const nextMessages = chat.messages
          .map((message) => (message.id === userMessageId ? maskedUserMessage : message))
          .concat(aiMessage);
        savedTitle = nextTitle;
        savedMessages = nextMessages;
        return {
          ...chat,
          messages: nextMessages,
          title: nextTitle,
          updatedAt: new Date().toISOString(),
        };
      }));

      await saveConversation(targetChatId, savedTitle || generateChatTitle(originalText), savedMessages);
    } catch (err) {
      const aiMessage = {
        id: crypto.randomUUID(),
        text: err.response?.data?.detail || '백엔드 응답 처리 중 오류가 발생했습니다.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

        setChats(prev => prev.map(chat => (
        chat.id === targetChatId
          ? {
              ...chat,
              messages: [
                ...chat.messages.map((message) => (
                  message.id === userMessageId && previewUserMessage ? previewUserMessage : message
                )),
                aiMessage,
              ],
              updatedAt: new Date().toISOString(),
            }
          : chat
      )));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 메시지 전송 =====
  // 역할:
  // 1) 홈 화면(채팅 없는 상태)에서 전송하면 새 채팅 자동 생성
  // 2) 기존 채팅에서 전송하면 해당 채팅에 메시지 추가
  // 3) 첫 번째 메시지 전송 후 AI 응답 시 채팅 제목 자동 생성
  const handleSend = () => {
    // [버그 수정] isLoading 가드 추가
    // InputBox 내부(버튼 disabled, Enter 차단)에서도 막지만,
    // handleSend 자체에도 가드를 두어 외부 호출 시에도 중복 전송 방지
    if (!inputText.trim() || isLoading) return;

    // 입력창을 즉시 비워 UX 지연 없애기 (capturedInput에 원본 저장)
    const capturedInput = inputText;
    setInputText('');

    // 현재 채팅이 없으면 새 채팅을 만들어서 진행
    let targetChatId = currentChatId;
    let isFirstMessage = false;

    if (!targetChatId) {
      // 홈 화면에서 첫 전송: 새 채팅 생성
      // [버그 수정] Date.now() → crypto.randomUUID()
      // Date.now()는 밀리초 단위라 같은 틱에 호출 시 아래 userMessage.id와
      // 같은 값이 생성되는 충돌이 발생할 수 있음
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
      // 기존 채팅: 메시지가 하나도 없는 경우에만 첫 메시지로 판단
      const existingChat = chats.find(c => c.id === targetChatId);
      isFirstMessage = (existingChat?.messages?.length ?? 0) === 0;
    }

    // 사용자 메시지 객체 구성
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

    // 첫 번째 메시지일 때만 자동 생성 제목을 전달, 이후 메시지는 null (기존 제목 유지)
    requestAIResponse(
      targetChatId,
      capturedInput,
      userMessage.id,
      isFirstMessage ? generateChatTitle(capturedInput) : null
    );
  };

  // ===== 메시지 수정 =====
  // 역할:
  // 1) 수정된 메시지 이후의 모든 메시지 삭제 (맥락 불일치 방지)
  // 2) 수정된 텍스트로 해당 메시지 업데이트
  // 3) 수정된 내용 기준으로 AI 재응답 생성
  const handleEditMessage = (messageId, newText) => {
    if (!newText.trim()) return;

    const capturedText = newText.trim();
    // currentChatId를 즉시 캡처
    // setTimeout 실행 전에 사용자가 다른 채팅으로 이동해도
    // AI 응답이 원래 채팅에 정확히 추가되도록 보장
    const capturedChatId = currentChatId;
    setIsLoading(true);

    setChats(prev => prev.map(chat => {
      if (chat.id !== capturedChatId) return chat;

      // 수정된 메시지의 위치 확인
      const editedIndex = chat.messages.findIndex(msg => msg.id === messageId);
      if (editedIndex === -1) return chat;

      // 수정된 메시지까지만 남기고 이후 메시지 전부 삭제
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

    // 메시지 수정 시에는 제목 변경 없이 AI 재응답만 요청
    requestAIResponse(capturedChatId, capturedText, messageId);
  };

  // ===== 프로젝트 생성 =====
  // ProjectModal의 onSave 콜백 시그니처: (projectId, projectData)
  // 새 생성 시 projectId는 undefined → 무시하고 새 ID 부여
  const handleCreateProject = (_projectId, projectData) => {
    const newProject = {
      // [버그 수정] 프로젝트 ID도 고유 보장을 위해 crypto.randomUUID() 사용
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

  // ===== 프로젝트 모달 열기 (새 생성) =====
  const handleNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  // 현재 선택된 채팅 객체 (없으면 undefined → 홈 화면 표시)
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
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 프로젝트 생성 / 수정 모달 */}
      {isProjectModalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={editingProject ? handleUpdateProject : handleCreateProject}
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
