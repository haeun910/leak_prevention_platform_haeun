import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardPlus,
  MessageSquare,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import api from '../../../../api/client';
import NewChatButton from './NewChatButton';
import SidebarSearch from './SidebarSearch';
import SidebarFooter from './SidebarFooter';
import './Sidebar.css';

// 사이드바 컴포넌트
// 역할:
// 1) 새 채팅 시작
// 2) 검색
// 3) 프로젝트 목록 / 프로젝트 내부 채팅 목록 표S시
// 4) 미분류 채팅 표시
// 5) 로그아웃 / 대시보드 이동
function Sidebar({
  chats,
  currentChatId,
  projects,
  selectedProjectId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onSelectProject,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onAddChatToProject
}) {
  const navigate = useNavigate();

  // 로그인한 사용자 정보
  // useMemo로 마운트 시 한 번만 파싱
  // 컴포넌트 본문에 직접 쓰면 렌더링(메뉴 열기·검색 등)마다 파싱이 반복 실행됨
  const userInfo = useMemo(
    () => JSON.parse(sessionStorage.getItem('userInfo') || localStorage.getItem('userInfo') || '{}'),
    []
  );

  // 현재 열려 있는 드롭다운 메뉴 id
  const [openMenuChatId, setOpenMenuChatId] = useState(null);

  // 검색창 입력값
  const [searchText, setSearchText] = useState('');

  // 프로젝트 펼침 / 접힘 상태
  // 예: { projectId1: true, projectId2: false }
  const [expandedProjects, setExpandedProjects] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({ keyword: '', reason: '' });
  const [exceptionStatus, setExceptionStatus] = useState({ type: '', message: '' });
  const [isSubmittingException, setIsSubmittingException] = useState(false);

  // 로그아웃 처리
  const handleLogout = () => {
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('auth-Storage');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('auth-Storage');
    navigate('/login');
  };

  // 드롭다운 메뉴 열기 / 닫기
  const toggleMenu = (targetId, e) => {
    e.stopPropagation();
    setOpenMenuChatId(openMenuChatId === targetId ? null : targetId);
  };

  // 바깥 클릭 시 메뉴 닫기
  const closeMenu = () => {
    setOpenMenuChatId(null);
  };

  // 프로젝트 펼치기 / 접기
  const toggleProject = (projectId) => {
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const openExceptionModal = () => {
    setExceptionStatus({ type: '', message: '' });
    setExceptionForm({ keyword: '', reason: '' });
    setIsExceptionModalOpen(true);
    if (isCollapsed) setIsCollapsed(false);
  };

  const submitExceptionRequest = async (e) => {
    e.preventDefault();
    setExceptionStatus({ type: '', message: '' });
    if (!exceptionForm.keyword.trim() || !exceptionForm.reason.trim()) {
      setExceptionStatus({ type: 'error', message: '키워드와 요청 사유를 입력해 주세요.' });
      return;
    }

    setIsSubmittingException(true);
    try {
      await api.post('/mask/exception-requests', {
        keyword: exceptionForm.keyword.trim(),
        reason: exceptionForm.reason.trim(),
      });
      setExceptionStatus({ type: 'success', message: '예외 처리 요청이 접수되었습니다.' });
      setExceptionForm({ keyword: '', reason: '' });
    } catch (err) {
      setExceptionStatus({
        type: 'error',
        message: err.response?.data?.detail || '요청 접수에 실패했습니다.',
      });
    } finally {
      setIsSubmittingException(false);
    }
  };

  // 검색어 기준 채팅 필터링
  const filterChats = (chatList) => {
    if (!searchText.trim()) return chatList;

    return chatList.filter((chat) =>
      chat.title.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  // 특정 프로젝트에 속한 채팅 목록
  const getChatsByProject = (projectId) => {
    return filterChats(chats.filter((chat) => chat.projectId === projectId));
  };

  // 미분류 채팅 목록
  const getUncategorizedChats = () => {
    return filterChats(chats.filter((chat) => !chat.projectId));
  };

  // 미분류 채팅을 오늘 / 어제 / 이전으로 그룹핑
  const groupChatsByTime = (chatList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      오늘: [],
      어제: [],
      이전: []
    };

    chatList.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt);
      const chatDay = new Date(
        chatDate.getFullYear(),
        chatDate.getMonth(),
        chatDate.getDate()
      );

      if (chatDay.getTime() === today.getTime()) {
        groups.오늘.push(chat);
      } else if (chatDay.getTime() === yesterday.getTime()) {
        groups.어제.push(chat);
      } else {
        groups.이전.push(chat);
      }
    });

    return groups;
  };

  const uncategorizedChats = getUncategorizedChats();
  const groupedUncategorized = groupChatsByTime(uncategorizedChats);

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} onClick={closeMenu}>
      {/* =========================
          상단 영역
          ========================= */}
      <div className="sidebar-top">
        <div className="sidebar-header">
          {!isCollapsed && (
            <div className="sidebar-brand">
              <span className="sidebar-brand-mark" aria-hidden="true">
                <ShieldCheck size={18} strokeWidth={2.2} />
              </span>
              <span className="sidebar-brand-text">Veil Workspace</span>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(prev => !prev);
            }}
            title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {isCollapsed ? (
          <button className="new-chat-btn icon-only" onClick={onNewChat} title="새 채팅">
            <Plus size={18} strokeWidth={2.5} />
          </button>
        ) : (
          <NewChatButton onNewChat={onNewChat} />
        )}

        {/* 검색 영역 */}
        {!isCollapsed && (
          <div className="sidebar-menu">
            <SidebarSearch
              searchText={searchText}
              onChangeSearchText={setSearchText}
              onClearSearchText={() => setSearchText('')}
            />
          </div>
        )}
       </div>

      {/* =========================
          채팅 / 프로젝트 목록 영역
          ========================= */}
      {!isCollapsed && <div className="chat-history">
        {/* 새 프로젝트 버튼 */}
        <button className="new-project-btn" onClick={onNewProject}>
          <Plus size={16} />
          새 프로젝트
        </button>

        {/* =========================
            프로젝트 목록
            ========================= */}
        {projects.length > 0 && (
          <div className="projects-section">
            {projects.map((project) => {
              const projectChats = getChatsByProject(project.id);
              const isExpanded = expandedProjects[project.id] !== false;
              const isSelectedProject = selectedProjectId === project.id;

              return (
                <div key={project.id} className="project-group">
                  {/* 프로젝트 헤더 */}
                  <div className={`project-header ${isSelectedProject ? 'active' : ''}`}>
                    {/* 펼치기 / 접기 버튼 */}
                    <button
                      className="project-toggle"
                      onClick={() => toggleProject(project.id)}
                      title={isExpanded ? '접기' : '펼치기'}
                    >
                      <ChevronRight
                        size={12}
                        style={{
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </button>

                    {/* 프로젝트 색상 점 */}
                    <div
                      className="project-color"
                      style={{ backgroundColor: project.color }}
                    ></div>

                    {/* 프로젝트 이름 + 개수 */}
                    <button
                      className="project-title-wrap"
                      onClick={() => onSelectProject(project.id)}
                      title={project.name}
                    >
                      <span className="project-name">{project.name}</span>
                      <span className="project-count">{projectChats.length}</span>
                    </button>

                    {/* 프로젝트 메뉴 버튼 */}
                    <button
                      className="project-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(`project_${project.id}`, e);
                      }}
                      title="프로젝트 메뉴"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* 프로젝트 드롭다운 메뉴 */}
                    {openMenuChatId === `project_${project.id}` && (
                      <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            closeMenu();
                            onEditProject(project);
                          }}
                        >
                          수정
                        </button>

                        <button
                          className="dropdown-item delete"
                          onClick={() => {
                            closeMenu();
                            onDeleteProject(project.id);
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 프로젝트 내부 채팅 목록 */}
                  {isExpanded && (
                    <div className="project-chat-list">
                      {projectChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`history-item project-chat ${currentChatId === chat.id ? 'active' : ''}`}
                          onClick={() => onSelectChat(chat.id)}
                        >
                          <MessageSquare size={16} className="chat-icon" />

                          <span className="history-title">{chat.title}</span>

                          {/* 채팅 메뉴 버튼 */}
                          <button
                            className="menu-toggle-btn"
                            onClick={(e) => toggleMenu(chat.id, e)}
                            title="채팅 메뉴"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* 채팅 드롭다운 메뉴 */}
                          {openMenuChatId === chat.id && (
                            <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  closeMenu();
                                  onRenameChat(chat.id);
                                }}
                              >
                                이름 변경
                              </button>

                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  closeMenu();
                                  onAddChatToProject(chat.id, null);
                                }}
                              >
                                프로젝트에서 제거
                              </button>

                              <button
                                className="dropdown-item delete"
                                onClick={() => {
                                  closeMenu();
                                  onDeleteChat(chat.id);
                                }}
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* =========================
            미분류 채팅
            ========================= */}
        {uncategorizedChats.length > 0 && (
          <div className="uncategorized-section">
            {Object.entries(groupedUncategorized).map(([groupName, groupChats]) => {
              if (groupChats.length === 0) return null;

              return (
                <div key={groupName} className="chat-group">
                  <div className="group-label">{groupName}</div>

                  {groupChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`history-item ${currentChatId === chat.id ? 'active' : ''}`}
                      onClick={() => onSelectChat(chat.id)}
                    >
                      <MessageSquare size={18} className="chat-icon" />

                      <span className="history-title">{chat.title}</span>

                      <button
                        className="menu-toggle-btn"
                        onClick={(e) => toggleMenu(chat.id, e)}
                        title="채팅 메뉴"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="12" cy="19" r="2"></circle>
                        </svg>
                      </button>

                      {openMenuChatId === chat.id && (
                        <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              closeMenu();
                              onRenameChat(chat.id);
                            }}
                          >
                            이름 변경
                          </button>

                          <button
                            className="dropdown-item delete"
                            onClick={() => {
                              closeMenu();
                              onDeleteChat(chat.id);
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {searchText && chats.length > 0 && filterChats(chats).length === 0 && (
          <div className="no-search-results">
            <Search size={48} strokeWidth={1.5} />
            <p>검색 결과가 없습니다</p>
            <button
              className="clear-search-btn"
              onClick={() => setSearchText('')}
            >
              검색 초기화
            </button>
          </div>
        )}

        {/* 대화 내역 없음 */}
        {chats.length === 0 && (
          <div className="empty-history">
            대화 내역이 없습니다
          </div>
        )}
      </div>}

      {isCollapsed && (
        <div className="collapsed-rail">
          <button className="rail-btn active" title="채팅">
            <MessageSquare size={18} />
          </button>
          <button className="rail-btn" onClick={onNewProject} title="새 프로젝트">
            <Plus size={18} />
          </button>
          <button className="rail-btn" onClick={openExceptionModal} title="키워드 예외 요청">
            <ClipboardPlus size={18} />
          </button>
          <button className="rail-btn" title="검색" onClick={() => setIsCollapsed(false)}>
            <Search size={18} />
          </button>
        </div>
      )}

      {/* =========================
          하단 사용자 영역
          ========================= */}
      {isCollapsed ? (
        <div className="collapsed-footer">
          <button className="collapsed-avatar" onClick={() => setIsCollapsed(false)} title={userInfo.name || '사용자'}>
            <ShieldCheck size={19} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="sidebar-bottom-stack">
          <button className="exception-request-btn footer-exception-btn" onClick={openExceptionModal}>
            <ClipboardPlus size={16} />
            {"\uD0A4\uC6CC\uB4DC \uC608\uC678 \uC694\uCCAD"}
          </button>
          <SidebarFooter
            userInfo={userInfo}
            onGoDashboard={() => navigate('/dashboard')}
            onLogout={handleLogout}
          />
        </div>
      )}

      {isExceptionModalOpen && (
        <div className="exception-modal-overlay" onClick={() => setIsExceptionModalOpen(false)}>
          <form className="exception-modal" onSubmit={submitExceptionRequest} onClick={(e) => e.stopPropagation()}>
            <div className="exception-modal-header">
              <div>
                <h2>키워드 예외 요청</h2>
                <p>업무 용어가 불필요하게 마스킹될 때 관리자에게 검토를 요청합니다.</p>
              </div>
              <button type="button" onClick={() => setIsExceptionModalOpen(false)} aria-label="닫기">×</button>
            </div>

            <label className="exception-field">
              <span>예외 처리 키워드</span>
              <input
                value={exceptionForm.keyword}
                onChange={(e) => setExceptionForm(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="예: KoELECTRA, 사내보안봇"
              />
            </label>

            <label className="exception-field">
              <span>요청 사유</span>
              <textarea
                rows={5}
                value={exceptionForm.reason}
                onChange={(e) => setExceptionForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="해당 키워드가 마스킹되면 안 되는 업무상 이유를 적어 주세요."
              />
            </label>

            {exceptionStatus.message && (
              <p className={`exception-message ${exceptionStatus.type}`}>{exceptionStatus.message}</p>
            )}

            <div className="exception-actions">
              <button type="button" className="exception-cancel" onClick={() => setIsExceptionModalOpen(false)}>
                취소
              </button>
              <button type="submit" className="exception-submit" disabled={isSubmittingException}>
                {isSubmittingException ? '요청 중' : '요청하기'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
