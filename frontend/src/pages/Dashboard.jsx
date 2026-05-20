import DashboardHome from '../features/dashboard/pages/DashboardHome';

// 대시보드 라우팅 진입 페이지
// 역할:
// 1) App.jsx에서 /dashboard 경로로 접속했을 때 실행되는 페이지
// 2) 실제 대시보드 화면은 features/dashboard/pages/DashboardHome.jsx에서 관리
// 3) 나중에 사용자별 통계, 부서별 통계, 예외 요청 관리 페이지를 추가할 수 있음
function Dashboard() {
  return <DashboardHome />;
}

export default Dashboard;