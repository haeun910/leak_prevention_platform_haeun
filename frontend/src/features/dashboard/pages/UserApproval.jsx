import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { getAdminUsers, updateAdminUser } from '../services/dashboardApi';
import { useModal } from '../../../components/AppModal';
import '../dashboard.css';

const roleLabels = {
  admin: { text: '관리자', cls: 'admin' },
  user: { text: '일반 직원', cls: 'user' },
  pending: { text: '승인 대기', cls: 'pending' },
  rejected: { text: '거절됨', cls: 'rejected' },
};

function UserApproval() {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberRole, setMemberRole] = useState('all');
  const [memberDepartment, setMemberDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getAdminUsers()
      .then(({ data }) => setUsers(data))
      .catch((err) => setError(err.response?.data?.detail || '사용자 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (user, role, confirmMsg) => {
    const ok = await showConfirm(confirmMsg);
    if (!ok) return;
    try {
      await updateAdminUser(user.id, { role });
      load();
    } catch (err) {
      await showAlert(err.response?.data?.detail || '처리에 실패했습니다.');
    }
  };

  const pendingUsers = users.filter((u) => u.role === 'pending');
  const activeUsers = users.filter((u) => u.role !== 'pending' && u.role !== 'rejected');
  const departments = useMemo(() => {
    const names = activeUsers
      .map((user) => user.department || '미지정')
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [activeUsers]);
  const filteredUsers = useMemo(() => {
    const keyword = memberQuery.trim().toLowerCase();
    return activeUsers.filter((user) => {
      const roleLabel = roleLabels[user.role]?.text || user.role || '';
      const department = user.department || '미지정';
      const matchesQuery = !keyword || [
        user.name,
        user.username,
        department,
        roleLabel,
        user.created_at ? user.created_at.slice(0, 10) : '',
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
      const matchesRole = memberRole === 'all' || user.role === memberRole;
      const matchesDepartment = memberDepartment === 'all' || department === memberDepartment;
      return matchesQuery && matchesRole && matchesDepartment;
    });
  }, [activeUsers, memberDepartment, memberQuery, memberRole]);

  return (
    <DashboardLayout
      title="회원 승인 관리"
      description="가입 신청을 승인하거나 거절하고, 계정 역할을 관리합니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <h2>승인 대기 중인 가입 신청</h2>
          <p>
            {pendingUsers.length > 0
              ? `${pendingUsers.length}건의 신청이 대기 중입니다.`
              : '대기 중인 신청이 없습니다.'}
          </p>
        </div>

        {loading ? (
          <div className="dashboard-state">불러오는 중입니다.</div>
        ) : pendingUsers.length === 0 ? (
          <p className="approval-empty">대기 중인 가입 신청이 없습니다.</p>
        ) : (
          <div className="request-table-wrap">
            <table className="request-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>아이디 (이메일)</th>
                  <th>부서</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '-'}</td>
                    <td>{u.username}</td>
                    <td>{u.department || '-'}</td>
                    <td>
                      <div className="approval-action-group">
                        <button
                          className="approval-btn approve"
                          type="button"
                          onClick={() => changeRole(u, 'user', `${u.name || u.username} 계정을 승인하시겠습니까?`)}
                        >
                          승인
                        </button>
                        <button
                          className="approval-btn reject"
                          type="button"
                          onClick={() => changeRole(u, 'rejected', `${u.name || u.username} 계정의 가입을 거절하시겠습니까?`)}
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

      <section className="dashboard-card">
        <div className="dashboard-card-header dashboard-card-header-row approval-member-header">
          <div>
            <h2>전체 회원 목록</h2>
            <p>
              총 {activeUsers.length}명 중 {filteredUsers.length}명 표시
            </p>
          </div>
          <div className="approval-member-tools">
            <label className="dashboard-search">
              <Search size={16} />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="이름, 아이디, 부서 검색"
              />
            </label>
            <div className="exception-filter" aria-label="역할 필터">
              <button className={memberRole === 'all' ? 'active' : ''} onClick={() => setMemberRole('all')} type="button">전체</button>
              <button className={memberRole === 'user' ? 'active' : ''} onClick={() => setMemberRole('user')} type="button">직원</button>
              <button className={memberRole === 'admin' ? 'active' : ''} onClick={() => setMemberRole('admin')} type="button">관리자</button>
            </div>
            <select
              className="approval-filter-select"
              value={memberDepartment}
              onChange={(e) => setMemberDepartment(e.target.value)}
              aria-label="부서 필터"
            >
              <option value="all">전체 부서</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-state">불러오는 중입니다.</div>
        ) : (
          <div className="request-table-wrap">
            <table className="request-table approval-member-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>아이디 (이메일)</th>
                  <th>부서</th>
                  <th>역할</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const label = roleLabels[u.role] || { text: u.role, cls: '' };
                  return (
                    <tr key={u.id}>
                      <td>{u.name || '-'}</td>
                      <td>{u.username}</td>
                      <td>{u.department || '-'}</td>
                      <td><span className={`role-pill ${label.cls}`}>{label.text}</span></td>
                      <td className="muted-cell">{u.created_at ? u.created_at.slice(0, 10) : '-'}</td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="5">표시할 사용자가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default UserApproval;
