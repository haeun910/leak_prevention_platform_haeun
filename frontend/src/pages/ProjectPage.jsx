import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from "../features/chat/components/sidebar/Sidebar";
import ProjectModal from "../features/chat/components/sidebar/ProjectModal";
import { useChatProject } from '../features/chat/hooks/useChatProject';
import { ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import './ProjectPage.css';

function ProjectPage() {
  // URL에서 현재 프로젝트 id를 가져옴
  const { projectId } = useParams();

  const navigate = useNavigate();

  // 로그인한 사용자 정보 — ChatPage와 동일하게 useMemo로 마운트 시 한 번만 파싱
  const userInfo = useMemo(() => JSON.parse(localStorage.getItem('userInfo') || '{}'), []);
  const userEmail = userInfo.email || 'guest';

  // ===== 공유 상태 — useChatProject hook =====
  // chats / projects 로드·저장·공통 조작을 hook으로 위임
  // (중복 제거: ChatPage도 동일한 hook 사용)
  const {
    chats, setChats,
    projects, setProjects,
    isDataLoaded,
    deleteChat,
    renameChat,
    addChatToProject,
    deleteProject,
  } = useChatProject(userEmail);

  // ===== 이 페이지 전용 State =====
  const [project, setProject] = useState(null);         // 현재 프로젝트 상세 정보
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [tempDescription, setTempDescription] = useState('');
  const [tempInstructions, setTempInstructions] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // ===== 현재 프로젝트 초기화 =====
  // hook의 isDataLoaded가 true가 되는 순간 한 번만 실행
  // 로드된 projects에서 URL의 projectId에 해당하는 프로젝트를 찾아 설정
  useEffect(() => {
    if (!isDataLoaded) return;

    const foundProject = projects.find((p) => p.id === projectId);
    if (foundProject) {
      setProject(foundProject);
      setTempDescription(foundProject.description || '');
      setTempInstructions(foundProject.instructions || '');
    } else {
      // 존재하지 않는 프로젝트 URL이면 채팅 페이지로 이동
      navigate('/chat');
    }
  // isDataLoaded가 true로 바뀌는 시점에만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]);

  // ========================================
  // 프로젝트 공통 업데이트 함수
  // - 이름 / 색상 / 설명 / AI 지시사항 모두 여기로 갱신
  // ========================================
  const updateProject = (updates) => {
    const updatedProjects = projects.map((p) =>
      p.id === projectId
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );

    setProjects(updatedProjects);

    const updatedProject = updatedProjects.find((p) => p.id === projectId);
    setProject(updatedProject);

    // 설명/지시사항 local state도 동기화
    if (updatedProject) {
      setTempDescription(updatedProject.description || '');
      setTempInstructions(updatedProject.instructions || '');
    }
  };

  // ========================================
  // 프로젝트 설명 저장
  // ========================================
  const handleSaveDescription = () => {
    updateProject({ description: tempDescription });
    setIsEditingDescription(false);
  };

  // ========================================
  // AI 지시사항 저장
  // ========================================
  const handleSaveInstructions = () => {
    updateProject({ instructions: tempInstructions });
    setIsEditingInstructions(false);
  };

  // ========================================
  // 새 채팅 생성
  // - 현재 프로젝트에 속한 새 채팅을 만들고
  // - 채팅 페이지로 이동
  // ========================================
  const handleNewChat = () => {
    const newChat = {
      // [버그 수정] Date.now() 대신 crypto.randomUUID() 사용
      // Date.now()는 밀리초 단위로 동일 틱에 충돌 가능성 있음
      id: crypto.randomUUID(),
      title: '새 채팅',
      messages: [],
      projectId: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setChats((prev) => [newChat, ...prev]);
    navigate('/chat', { state: { chatId: newChat.id } });
  };

  // ========================================
  // 채팅 선택
  // ========================================
  const handleSelectChat = (chatId) => {
    navigate('/chat', { state: { chatId } });
  };

  // ========================================
  // 프로젝트 선택
  // - 사이드바 프로젝트 클릭 시 실행
  // ========================================
  const handleSelectProject = (id) => {
    navigate(`/project/${id}`);
  };

  // ========================================
  // 프로젝트 삭제
  // hook의 deleteProject로 상태 변경을 위임하고,
  // 현재 보고 있는 프로젝트가 삭제된 경우에만 navigate 처리 (이 페이지 전용 로직)
  // ========================================
  // deleteProject가 async이므로 await 필요
  const handleDeleteProject = async (targetProjectId) => {
    const deleted = await deleteProject(targetProjectId);
    if (deleted && targetProjectId === projectId) {
      navigate('/chat');
    }
  };

  // ========================================
  // 프로젝트 수정 모달 열기
  // - 프로젝트 상세 페이지 상단 버튼
  // - 사이드바 점 세개 메뉴의 "수정"
  // 둘 다 이 함수로 연결
  // ========================================
  const handleEditProject = () => {
    setIsProjectModalOpen(true);
  };

  // ========================================
  // ProjectModal에서 수정 내용 저장
  // - 이름 / 색상 / 설명 / AI 지시사항 모두 한 번에 저장
  // ========================================
  const handleUpdateProject = (targetProjectId, projectData) => {
    const updatedProjects = projects.map((proj) =>
      proj.id === targetProjectId
        ? {
            ...proj,
            name: projectData.name,
            color: projectData.color,
            description: projectData.description,
            instructions: projectData.instructions,
            updatedAt: new Date().toISOString()
          }
        : proj
    );

    setProjects(updatedProjects);

    const updatedProject = updatedProjects.find((proj) => proj.id === targetProjectId);
    setProject(updatedProject);

    if (updatedProject) {
      setTempDescription(updatedProject.description || '');
      setTempInstructions(updatedProject.instructions || '');
    }

    setIsProjectModalOpen(false);
  };

  // ========================================
  // 새 프로젝트 생성
  // - 현재는 채팅 페이지에서 생성하도록 유지
  // ========================================
  const handleNewProject = () => {
    navigate('/chat');
  };

  // 현재 프로젝트에 속한 채팅 목록
  const projectChats = chats.filter((chat) => chat.projectId === projectId);

  // 프로젝트가 아직 없으면 로딩 표시
  if (!project) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#999'
        }}
      >
        로딩 중...
      </div>
    );
  }

  return (
    <div className="project-page">
      {/* 왼쪽 사이드바 */}
      <Sidebar
        chats={chats}
        currentChatId={null}
        projects={projects}
        selectedProjectId={projectId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        onSelectProject={handleSelectProject}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onAddChatToProject={addChatToProject}
      />

      {/* 오른쪽 메인 영역 */}
      <div className="project-main">
        {/* 상단 헤더 */}
        <div className="project-header-bar">
          {/* 뒤로 가기 */}
          <button className="back-btn" onClick={() => navigate('/chat')}>
            <ArrowLeft size={20} />
            뒤로
          </button>

          {/* 프로젝트 제목 영역 */}
          <div className="project-title-section">
            <div
              className="project-color-dot"
              style={{ backgroundColor: project.color }}
            ></div>

            <h1 className="project-title">{project.name}</h1>

            {/* 프로젝트 수정 버튼
                이름 / 색상 / 설명 / AI 지시사항을 한 번에 수정 */}
            <button className="edit-section-btn" onClick={handleEditProject}>
              프로젝트 수정
            </button>
          </div>
        </div>

        <div className="project-content">
          {/* =========================
              프로젝트 설명
              ========================= */}
          <div className="project-section">
            <div className="section-header">
              <h2 className="section-title"> 프로젝트 설명</h2>
              {!isEditingDescription && (
                <button
                  className="edit-section-btn"
                  onClick={() => setIsEditingDescription(true)}
                >
                  수정
                </button>
              )}
            </div>

            {isEditingDescription ? (
              <div className="edit-section">
                <textarea
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  placeholder="이 프로젝트가 무엇을 다루는지 설명해주세요..."
                  rows="4"
                  autoFocus
                />
                <div className="edit-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setTempDescription(project.description || '');
                      setIsEditingDescription(false);
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSaveDescription}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="section-content">
                {project.description || (
                  <div
                    className="empty-placeholder"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    클릭하여 프로젝트 설명을 추가하세요...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================
              AI 지시사항
              ========================= */}
          <div className="project-section">
            <div className="section-header">
              <h2 className="section-title"> AI 지시사항</h2>
              {!isEditingInstructions && (
                <button
                  className="edit-section-btn"
                  onClick={() => setIsEditingInstructions(true)}
                >
                  수정
                </button>
              )}
            </div>

            {isEditingInstructions ? (
              <div className="edit-section">
                <textarea
                  value={tempInstructions}
                  onChange={(e) => setTempInstructions(e.target.value)}
                  placeholder="AI에게 어떻게 답변해달라고 요청할까요?&#10;예: 마케팅 전문가처럼 답변해주세요."
                  rows="5"
                  autoFocus
                />
                <div className="field-hint-project">
                  AI의 역할, 답변 스타일, 주의사항 등을 설정하면 더 정확한 답변을 받을 수 있습니다
                </div>
                <div className="edit-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setTempInstructions(project.instructions || '');
                      setIsEditingInstructions(false);
                    }}
                  >
                    취소
                  </button>
                  <button
                    className="save-btn"
                    onClick={handleSaveInstructions}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="section-content">
                {project.instructions || (
                  <div
                    className="empty-placeholder"
                    onClick={() => setIsEditingInstructions(true)}
                  >
                    클릭하여 AI 지시사항을 추가하세요...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================
              프로젝트 채팅 목록
              ========================= */}
          <div className="project-section">
            <div className="section-header">
              <h2 className="section-title"> 프로젝트 채팅 ({projectChats.length})</h2>
            </div>

            <div className="chats-list">
              {projectChats.length > 0 ? (
                projectChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="chat-item"
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <MessageSquare size={18} />
                    <span className="chat-title">{chat.title}</span>
                    <span className="chat-date">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-chats">
                  아직 채팅이 없습니다
                </div>
              )}

              <button className="new-chat-in-project-btn" onClick={handleNewChat}>
                <Plus size={16} strokeWidth={2.5} />
                새 채팅 시작
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          프로젝트 수정 모달
          - 생성 때 쓰던 ProjectModal을 수정용으로 재사용
          ========================= */}
      {isProjectModalOpen && (
        <ProjectModal
          project={project}
          onSave={handleUpdateProject}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}
    </div>
  );
}

export default ProjectPage;