import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useModal } from '../../../components/AppModal';
import '../dashboard.css';

// =====================================================
// 역할 표시 유틸 (순수 함수 → 컴포넌트 외부에 정의)
// 역할: role 값을 한글 텍스트와 색상으로 변환
// 컴포넌트 밖에 두어 렌더링마다 재생성되지 않도록 함
// =====================================================
function getRoleLabel(role) {
  switch (role) {
    case 'admin':    return { text: '관리자',    color: '#4f46e5' };
    case 'user':     return { text: '일반 직원', color: '#059669' };
    case 'pending':  return { text: '승인 대기', color: '#d97706' };
    case 'rejected': return { text: '거절됨',   color: '#dc2626' };
    default:         return { text: role,        color: '#6b7280' };
  }
}

// =====================================================
// UserApproval 페이지
// 역할:
// 1) 보안팀으로 가입한 pending 사용자 목록 표시
// 2) 승인 → role: 'admin' 으로 변경 (관리자 권한 부여)
// 3) 거절 → role: 'rejected' 으로 변경 (로그인 불가)
// 4) 전체 회원 목록에서 비밀번호 초기화 기능 제공
//    (임시 비밀번호 '0000'으로 설정 후 사용자에게 안내)
// 5) 백엔드 연동 시 localStorage 조작을 API 호출로 교체
// =====================================================
function UserApproval() {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState([]);

  // 마운트 시 localStorage에서 전체 사용자 목록 로드
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(stored);
  }, []);

  // localStorage와 state를 동시에 업데이트하는 헬퍼
  // 모든 변경 함수에서 공통으로 사용해 중복 코드 제거
  const syncUsers = (updated) => {
    localStorage.setItem('users', JSON.stringify(updated));
    setUsers(updated);
  };

  // 승인: pending → admin (관리자 권한 부여)
  const handleApprove = async (email) => {
    const ok = await showConfirm(`${email} 계정을 관리자로 승인하시겠습니까?`);
    if (!ok) return;
    syncUsers(users.map(u => u.email === email ? { ...u, role: 'admin' } : u));
  };

  // 거절: pending → rejected (로그인 시 거절 안내 표시)
  const handleReject = async (email) => {
    const ok = await showConfirm(`${email} 계정의 가입을 거절하시겠습니까?`);
    if (!ok) return;
    syncUsers(users.map(u => u.email === email ? { ...u, role: 'rejected' } : u));
  };

  // 비밀번호 초기화: 임시 비밀번호 '0000'으로 설정
  const handleResetPassword = async (email) => {
    const ok = await showConfirm(`${email} 계정의 비밀번호를 '0000'으로 초기화하시겠습니까?`);
    if (!ok) return;
    // ⚠️ 보안 위험: 임시 비밀번호도 평문 저장 — 백엔드 연동 시 서버 측 해싱으로 교체 필요
    syncUsers(users.map(u => u.email === email ? { ...u, password: '0000' } : u));
    await showAlert(`비밀번호가 '0000'으로 초기화되었습니다.\n해당 사용자에게 안내 후 변경을 요청하세요.`);
  };

  // pending 사용자와 나머지 사용자 분리
  const pendingUsers = users.filter(u => u.role === 'pending');
  const otherUsers   = users.filter(u => u.role !== 'pending');

  return (
    <DashboardLayout
      title="회원 승인 관리"
      description="보안팀 가입 신청을 승인하거나 거절하고, 비밀번호를 초기화합니다."
    >
      {/* ── 승인 대기 섹션 ── */}
      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>승인 대기 중인 가입 신청</h2>
          <p>보안팀으로 가입 신청한 계정입니다. 승인 시 관리자(admin) 권한이 부여됩니다.</p>
        </div>

        {pendingUsers.length === 0 ? (
          <p className="approval-empty">대기 중인 신청이 없습니다.</p>
        ) : (
          <div className="request-table-wrap">
            <table className="request-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>사번</th>
                  <th>부서</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.empId || '-'}</td>
                    <td>{u.department}</td>
                    <td>
                      {/* 승인/거절 버튼 묶음 */}
                      <div className="approval-action-group">
                        <button
                          className="approval-btn approve"
                          onClick={() => handleApprove(u.email)}
                        >
                          승인
                        </button>
                        <button
                          className="approval-btn reject"
                          onClick={() => handleReject(u.email)}
                        >
                          거절
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 전체 회원 목록 섹션 ── */}
      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>전체 회원 목록</h2>
          <p>비밀번호 초기화가 필요한 경우 '초기화' 버튼을 클릭하세요. (임시 비밀번호: 0000)</p>
        </div>

        <div className="request-table-wrap">
          <table className="request-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>사번</th>
                <th>부서</th>
                <th>역할</th>
                <th>비밀번호</th>
              </tr>
            </thead>
            <tbody>
              {otherUsers.map(u => {
                const label = getRoleLabel(u.role);
                return (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.empId || '-'}</td>
                    <td>{u.department}</td>
                    <td>
                      {/* 역할마다 색상이 다르므로 inline style로 color 적용 */}
                      <span
                        className="role-label"
                        style={{ color: label.color }}
                      >
                        {label.text}
                      </span>
                    </td>
                    <td>
                      <button
                        className="approval-btn reset"
                        onClick={() => handleResetPassword(u.email)}
                      >
                        초기화
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default UserApproval;
