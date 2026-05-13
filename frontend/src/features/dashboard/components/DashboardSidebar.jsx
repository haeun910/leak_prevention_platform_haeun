import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Building2, ClipboardList, Home, ShieldCheck, UserCheck, UserCog, Users, ArrowLeft } from 'lucide-react';

// =====================================================
// 관리자 메뉴 목록 (컴포넌트 외부 상수로 정의)
// - 상태/props를 참조하지 않는 순수 데이터이므로 밖에 둬
//   렌더링마다 배열이 재생성되지 않도록 함
// - isReady: true → 실제 라우트 연결 / false → 준비중 표시
// - 새 대시보드 페이지 추가 시 이 배열에만 항목 추가하면 됨
// =====================================================
const MENU_ITEMS = [
  { label: '대시보드 홈', path: '/dashboard', isReady: true, icon: Home },
  { label: '회원 승인 관리', path: '/dashboard/approval', isReady: true, icon: UserCheck },
  { label: '사용자 관리', path: '/dashboard/user-management', isReady: true, icon: UserCog },
  { label: '사용자별 통계', path: '/dashboard/users', isReady: true, icon: Users },
  { label: '부서별 통계', path: '/dashboard/departments', isReady: true, icon: Building2 },
  { label: '예외 관리', path: '/dashboard/exceptions', match: ['/dashboard/exceptions', '/dashboard/keywords'], isReady: true, icon: ClipboardList },
  { label: '보안 현황 이력', path: '/dashboard/logs', isReady: true, icon: BarChart3 },
];

// =====================================================
// DashboardSidebar 컴포넌트
// 역할:
// 1) 관리자용 사이드 네비게이션 메뉴 표시
// 2) 연결된 페이지: 대시보드 홈, 회원 승인 관리
// 3) 준비중 메뉴는 비활성화 배지로 표시
// 4) 채팅 화면으로 돌아가기 버튼 제공
// =====================================================
function DashboardSidebar({ userInfo }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="dashboard-sidebar">
      {/* 로고 / 제목 영역 */}
      <div className="dashboard-logo-area">
        <div className="dashboard-logo-icon">
          <ShieldCheck size={22} strokeWidth={2.4} />
        </div>
        <div>
          <div className="dashboard-logo-title">Admin</div>
          <div className="dashboard-logo-subtitle">AI Masking Platform</div>
        </div>
      </div>

      {/* 관리자 정보 */}
      <div className="dashboard-admin-box">
        <div className="dashboard-admin-avatar">
          {userInfo.name ? userInfo.name.charAt(0) : 'A'}
        </div>
        <div>
          <div className="dashboard-admin-name">
            {userInfo.name || '관리자'}
          </div>
          <div className="dashboard-admin-role">
            {userInfo.department || '관리자 부서'}
          </div>
        </div>
      </div>

      {/* 메뉴 영역 */}
      <nav className="dashboard-menu-list">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.match ? item.match.includes(location.pathname) : location.pathname === item.path;
          return (
            <button
              key={item.label}
              className={`dashboard-menu-item ${isActive ? 'active' : ''} ${item.isReady ? '' : 'disabled'}`}
              onClick={() => {
                if (item.isReady) {
                  navigate(item.path);
                }
              }}
              type="button"
            >
              <Icon size={16} />
              <span>{item.label}</span>

              {!item.isReady && (
                <span className="dashboard-menu-badge">준비중</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 채팅 화면으로 돌아가기 */}
      <button
        className="dashboard-back-btn"
        type="button"
        onClick={() => navigate('/chat')}
      >
        <ArrowLeft size={16} />
        <span>채팅으로 돌아가기</span>
      </button>
    </aside>
  );
}

export default DashboardSidebar;
