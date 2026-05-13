import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, UserCog } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { deleteAdminUser, getAdminUsers, updateAdminUser } from '../services/dashboardApi';
import { useModal } from '../../../components/AppModal';
import '../dashboard.css';

const roleLabels = {
  admin: '관리자',
  user: '일반 사용자',
  pending: '승인 대기',
  rejected: '거절됨',
};

function UserManagementPage() {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
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

  const visibleUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => [
      user.username,
      user.name,
      user.department,
      roleLabels[user.role] || user.role,
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [query, users]);

  const updateRole = async (user, role) => {
    await updateAdminUser(user.id, { role });
    load();
  };

  const removeUser = async (user) => {
    const ok = await showConfirm(`${user.name || user.username} 계정을 삭제하시겠습니까?\n퇴사자 계정 정리 용도로 사용하며, 해당 사용자의 대화 이력도 함께 정리됩니다.`);
    if (!ok) return;
    try {
      await deleteAdminUser(user.id);
      await showAlert('계정이 삭제되었습니다.');
      load();
    } catch (err) {
      await showAlert(err.response?.data?.detail || '계정을 삭제하지 못했습니다.');
    }
  };

  return (
    <DashboardLayout title="사용자 관리" description="재직자와 퇴사자 계정을 관리하고, 필요 시 계정을 삭제합니다.">
      {error && <div className="dashboard-state error">{error}</div>}
      <section className="dashboard-card user-management-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>전체 사용자</h2>
            <p>총 {users.length}개 계정 · 삭제 시 해당 사용자의 채팅 대화도 함께 정리됩니다.</p>
          </div>
          <label className="dashboard-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름, 이메일, 부서 검색" />
          </label>
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
                  <th>대화</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar-small">{(user.name || user.username || 'U').charAt(0)}</span>
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
                          <option value="rejected">거절됨</option>
                        </select>
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

      <section className="dashboard-card user-guide-card">
        <UserCog size={20} />
        <div>
          <h2>퇴사자 계정 정리</h2>
          <p>퇴사 또는 부서 이동 등으로 접근 권한이 사라진 계정은 이 화면에서 삭제하거나 권한을 변경해 관리할 수 있습니다.</p>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default UserManagementPage;
