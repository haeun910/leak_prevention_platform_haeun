import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';

const MENU_ITEMS = [
  { label: '대시보드', path: '/dashboard', isReady: true, icon: Home },
  { label: '회원 승인 관리', path: '/dashboard/approval', isReady: true, icon: UserCheck },
  { label: '사용자 계정 관리', path: '/dashboard/user-management', isReady: true, icon: UserCog },
  { label: '사용자별 통계', path: '/dashboard/users', isReady: true, icon: Users },
  { label: '부서별 통계', path: '/dashboard/departments', isReady: true, icon: Building2 },
  { label: '부서 변경 요청', path: '/dashboard/department-requests', isReady: true, icon: Building2 },
  { label: '예외 관리', path: '/dashboard/exceptions', match: ['/dashboard/exceptions', '/dashboard/keywords'], isReady: true, icon: ClipboardList },
  { label: '보안 현황 이력', path: '/dashboard/logs', isReady: true, icon: BarChart3 },
  { label: '보안 보고서', path: '/dashboard/reports', isReady: true, icon: FileText },
];

function DashboardSidebar({ userInfo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`dashboard-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="dashboard-sidebar-head">
        {!isCollapsed && (
          <div className="dashboard-logo-area">
            <div className="dashboard-logo-icon">
              <ShieldCheck size={22} strokeWidth={2.4} />
            </div>
            <div className="dashboard-logo-copy">
              <div className="dashboard-logo-title">Veil</div>
              <div className="dashboard-logo-subtitle">Workspace Admin</div>
            </div>
          </div>
        )}

        <button
          className="dashboard-collapse-btn"
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          type="button"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="dashboard-admin-box" title={`${userInfo.name || '관리자'} · ${userInfo.department || '관리자 부서'}`}>
        <div className="dashboard-admin-avatar">
          {userInfo.name ? userInfo.name.charAt(0) : 'A'}
        </div>
        {!isCollapsed && (
          <div className="dashboard-admin-copy">
            <div className="dashboard-admin-name">
              {userInfo.name || '관리자'}
            </div>
            <div className="dashboard-admin-role">
              {userInfo.department || '관리자 부서'}
            </div>
          </div>
        )}
      </div>

      <nav className="dashboard-menu-list">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.match ? item.match.includes(location.pathname) : location.pathname === item.path;
          return (
            <button
              key={item.label}
              className={`dashboard-menu-item ${isActive ? 'active' : ''} ${item.isReady ? '' : 'disabled'}`}
              onClick={() => {
                if (item.isReady) navigate(item.path);
              }}
              title={isCollapsed ? item.label : undefined}
              type="button"
            >
              <Icon className="dashboard-menu-icon" size={16} />
              {!isCollapsed && <span className="dashboard-menu-label">{item.label}</span>}
              {!isCollapsed && !item.isReady && <span className="dashboard-menu-badge">준비중</span>}
            </button>
          );
        })}
      </nav>

      <button
        className="dashboard-back-btn"
        title={isCollapsed ? '채팅으로 돌아가기' : undefined}
        type="button"
        onClick={() => navigate('/chat')}
      >
        <ArrowLeft className="dashboard-menu-icon" size={16} />
        {!isCollapsed && <span>채팅으로 돌아가기</span>}
      </button>
    </aside>
  );
}

export default DashboardSidebar;
