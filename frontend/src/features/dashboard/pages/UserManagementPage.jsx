import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, UserX } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { deleteAdminUser, getAdminUsers, updateAdminUser } from '../services/dashboardApi';
import { useModal } from '../../../components/AppModal';
import '../dashboard.css';

const roleLabels = {
  admin: '관리자',
  user: '일반 사용자',
  pending: '승인 대기',
  rejected: '퇴사/비활성',
};

function UserManagementPage() {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
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

  useEffect(() => {
    load();
  }, []);

  const departments = useMemo(() => {
    const names = users
      .map((user) => user.department || '미지정')
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [users]);

  const visibleUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => [
      user.username,
      user.name,
      user.department,
      roleLabels[user.role] || user.role,
    ].some((value) => !keyword || String(value || '').toLowerCase().includes(keyword))
      && (departmentFilter === 'all' || (user.department || '미지정') === departmentFilter));
  }, [departmentFilter, query, users]);

  const updateRole = async (user, role) => {
    await updateAdminUser(user.id, { role });
    load();
  };

  const terminateUser = async (user) => {
    const ok = await showConfirm(`${user.name || user.username} 계정을 퇴사 처리하시겠습니까?`);
    if (!ok) return;
    try {
      await updateAdminUser(user.id, { role: 'rejected' });
      await showAlert('계정을 퇴사 처리했습니다.');
      load();
    } catch (err) {
      await showAlert(err.response?.data?.detail || '퇴사 처리에 실패했습니다.');
    }
  };

  const removeUser = async (user) => {
    const ok = await showConfirm(`${user.name || user.username} 계정을 삭제하시겠습니까?`);
    if (!ok) return;
    try {
      await deleteAdminUser(user.id);
      await showAlert('계정을 삭제했습니다.');
      load();
    } catch (err) {
      await showAlert(err.response?.data?.detail || '계정을 삭제하지 못했습니다.');
    }
  };

  return (
    <DashboardLayout
      title="사용자 계정 관리"
      description="조직 구성원의 계정 권한과 계정 상태를 관리합니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}
      <section className="dashboard-card user-management-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>전체 사용자</h2>
            <p>총 {users.length}개 계정 중 {visibleUsers.length}개 표시</p>
          </div>
          <div className="approval-member-tools">
            <label className="dashboard-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름, 아이디, 부서 검색"
              />
            </label>
            <select
              className="approval-filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="부서 필터"
            >
              <option value="all">전체 부서</option>
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? <div className="dashboard-state">불러오는 중입니다.</div> : (
          <div className="request-table-wrap">
            <table className="request-table user-table">
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>부서</th>
                  <th>권한</th>
                  <th>가입일</th>
                  <th>활동</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div>
                          <strong>{user.name || '-'}</strong>
                          <span>{user.username}</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.department || '-'}</td>
                    <td><span className={`role-pill ${user.role}`}>{roleLabels[user.role] || user.role}</span></td>
                    <td className="muted-cell">{user.created_at ? user.created_at.slice(0, 10) : '-'}</td>
                    <td>{user.conversation_count}건 · 메시지 {user.message_count}개</td>
                    <td>
                      <div className="dashboard-action-group">
                        <select value={user.role} onChange={(e) => updateRole(user, e.target.value)} aria-label="권한 변경">
                          <option value="user">일반 사용자</option>
                          <option value="admin">관리자</option>
                          <option value="pending">승인 대기</option>
                          <option value="rejected">퇴사/비활성</option>
                        </select>
                        <button
                          className="warning"
                          type="button"
                          onClick={() => terminateUser(user)}
                          disabled={user.role === 'rejected'}
                        >
                          <UserX size={14} />
                          퇴사 처리
                        </button>
                        <button className="danger" type="button" onClick={() => removeUser(user)}>
                          <Trash2 size={14} />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && <tr><td colSpan="6">표시할 사용자가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default UserManagementPage;
