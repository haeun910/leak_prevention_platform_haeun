import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import Register from './pages/Register';
import ProjectPage from './pages/ProjectPage';
import UserApproval from './features/dashboard/pages/UserApproval';
import UserManagementPage from './features/dashboard/pages/UserManagementPage';
import UserStatsPage from './features/dashboard/pages/UserStatsPage';
import DepartmentStatsPage from './features/dashboard/pages/DepartmentStatsPage';
import ExceptionRequestsPage from './features/dashboard/pages/ExceptionRequestsPage';
import ExceptionKeywordsPage from './features/dashboard/pages/ExceptionKeywordsPage';
import SecurityLogsPage from './features/dashboard/pages/SecurityLogsPage';
import { ModalProvider } from './components/AppModal';

// =====================================================
// PrivateRoute 컴포넌트
// 역할:
// 1) 비로그인 사용자의 보호 페이지 접근을 막고 로그인 페이지로 리다이렉트
// 2) 역할 불일치 시 해당 역할의 홈 페이지로 리다이렉트
//    - user가 /dashboard 접근 → /chat
//    - admin이 /chat 접근 → /dashboard
// =====================================================
// ⚠️ 보안 위험: role 값이 localStorage에 저장되어 클라이언트에서 조작 가능
// 현재는 목업 단계이므로 임시 허용
// 백엔드 연동 시 JWT 또는 서버 세션 기반 권한 검증으로 교체 필요
function PrivateRoute({ children, requiredRole }) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const auth = JSON.parse(localStorage.getItem('auth-Storage') || '{}');
  const token = auth?.state?.token;

  if (!token || !userInfo.email) {
    return <Navigate to="/" replace />;
  }

  // [버그 수정] pending / rejected 계정 차단
  // - pending: 보안팀 가입 신청 후 아직 admin 승인을 받지 못한 상태
  // - rejected: admin이 가입을 거절한 상태
  // 두 역할 모두 로그인 화면으로 돌려보내 /chat, /project 등 접근 차단
  // 이 처리가 없으면 localStorage의 userInfo.role을 직접 수정하거나
  // 로그인 직후 URL을 입력해 보호 페이지에 진입할 수 있었음
  if (userInfo.role === 'pending' || userInfo.role === 'rejected') {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userInfo.role !== requiredRole) {
    return <Navigate to={userInfo.role === 'admin' ? '/dashboard' : '/chat'} replace />;
  }

  return children;
}

// =====================================================
// App 컴포넌트 - 전체 라우팅 구성
// - 공개 라우트: 로그인(/), 회원가입(/register)
// - 보호 라우트 (로그인 필수): /chat, /project/:id
// - 관리자 전용 라우트: /dashboard, /dashboard/approval
// =====================================================
function App() {
  return (
    // ModalProvider: window.confirm/prompt/alert를 대체하는 커스텀 모달을
    // 앱 전체에서 useModal()로 사용할 수 있게 최상단에서 감쌈
    <ModalProvider>
    <BrowserRouter>
      <Routes>
        {/* 공개 페이지 */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 보호된 페이지 - 로그인 필수 */}
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <PrivateRoute>
              <ProjectPage />
            </PrivateRoute>
          }
        />

        {/* 보호된 페이지 - admin만 접근 가능 */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute requiredRole="admin">
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/approval"
          element={
            <PrivateRoute requiredRole="admin">
              <UserApproval />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/user-management"
          element={
            <PrivateRoute requiredRole="admin">
              <UserManagementPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <PrivateRoute requiredRole="admin">
              <UserStatsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/departments"
          element={
            <PrivateRoute requiredRole="admin">
              <DepartmentStatsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/exceptions"
          element={
            <PrivateRoute requiredRole="admin">
              <ExceptionRequestsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/keywords"
          element={
            <PrivateRoute requiredRole="admin">
              <ExceptionKeywordsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/logs"
          element={
            <PrivateRoute requiredRole="admin">
              <SecurityLogsPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </ModalProvider>
  );
}

export default App;
