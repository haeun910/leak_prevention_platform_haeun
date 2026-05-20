import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

// 관리자 대시보드 공통 레이아웃 컴포넌트
// 역할:
// 1) 대시보드 전체 화면 틀 구성
// 2) 왼쪽 관리자 메뉴와 오른쪽 본문 영역을 분리
// 3) 대시보드 홈, 사용자 통계, 부서 통계 등 여러 페이지에서 공통으로 재사용 가능
function DashboardLayout({ title, description, children }) {
  // 로그인한 사용자 정보
  const userInfo = JSON.parse(sessionStorage.getItem('userInfo') || localStorage.getItem('userInfo') || '{}');

  return (
    <div className="dashboard-layout">
      {/* 왼쪽 관리자 메뉴 */}
      <DashboardSidebar userInfo={userInfo} />

      {/* 오른쪽 대시보드 본문 */}
      <main className="dashboard-main">
        <DashboardHeader
          title={title}
          userInfo={userInfo}
        />

        <section className="dashboard-content">
          {children}
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
