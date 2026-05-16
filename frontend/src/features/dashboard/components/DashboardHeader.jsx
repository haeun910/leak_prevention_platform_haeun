// 관리자 대시보드 상단 헤더 컴포넌트
// 역할:
// 1) 현재 대시보드 페이지 제목 표시
// 2) 오른쪽에 관리자 계정 정보를 간단히 표시
function DashboardHeader({ title, userInfo }) {
  return (
    <header className="dashboard-header">
      <div>
        <h1>{title}</h1>
      </div>

      <div className="dashboard-header-user">
        <span className="dashboard-header-label">관리자</span>
        <strong>{userInfo.name || 'Admin'}</strong>
      </div>
    </header>
  );
}

export default DashboardHeader;
