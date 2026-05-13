import { useEffect, useState } from 'react';
import { ClipboardList, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { deleteExceptionRequest, getExceptionRequests, updateExceptionRequest } from '../services/dashboardApi';
import '../dashboard.css';

function ExceptionRequestsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getExceptionRequests()
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.detail || '예외 요청을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id, status) => {
    await updateExceptionRequest(id, { status });
    load();
  };

  const remove = async (id) => {
    await deleteExceptionRequest(id);
    load();
  };

  const pendingCount = rows.filter((row) => row.status === 'pending').length;
  const approvedCount = rows.filter((row) => row.status === 'approved').length;
  const rejectedCount = rows.filter((row) => row.status === 'rejected').length;
  const visibleRows = filter === 'all' ? rows : rows.filter((row) => row.status === filter);
  const formatDate = (value) => value ? value.slice(0, 10) : '-';

  return (
    <DashboardLayout
      title="예외 관리"
      description="마스킹 예외 요청을 처리하고 승인된 키워드 목록을 관리합니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}
      <div className="exception-tabs">
        <button className="exception-tab active">
          <ClipboardList size={16} />
          예외 요청
          <span>{pendingCount}</span>
        </button>
        <button className="exception-tab" onClick={() => navigate('/dashboard/keywords')}>
          <KeyRound size={16} />
          예외 키워드 목록
          <span>{approvedCount}</span>
        </button>
      </div>

      <article className="dashboard-card dashboard-card-large exception-management-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>예외 요청 목록</h2>
            <p>대기 중 {pendingCount}건 · 승인 {approvedCount}건 · 거절 {rejectedCount}건</p>
          </div>
          <div className="exception-filter">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button>
            <button className={filter === 'pending' ? 'active' : ''} onClick={() => setFilter('pending')}>대기중</button>
            <button className={filter === 'approved' ? 'active' : ''} onClick={() => setFilter('approved')}>승인</button>
            <button className={filter === 'rejected' ? 'active' : ''} onClick={() => setFilter('rejected')}>거절</button>
          </div>
        </div>
        {loading ? <div className="dashboard-state">불러오는 중입니다.</div> : (
          <div className="request-table-wrap">
            <table className="request-table exception-table">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>요청자</th>
                  <th>부서</th>
                  <th>사유</th>
                  <th>요청일</th>
                  <th>상태</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td className="exception-keyword-cell">{row.keyword}</td>
                    <td>{row.requester || '-'}</td>
                    <td>{row.department || '-'}</td>
                    <td>{row.reason || '-'}</td>
                    <td className="muted-cell">{formatDate(row.created_at)}</td>
                    <td><span className={`exception-status ${row.status}`}>{row.status === 'pending' ? '대기중' : row.status === 'approved' ? '승인' : '거절'}</span></td>
                    <td>
                      {row.status === 'pending' ? (
                        <div className="dashboard-action-group">
                          <button onClick={() => changeStatus(row.id, 'approved')}>승인</button>
                          <button className="danger" onClick={() => changeStatus(row.id, 'rejected')}>거절</button>
                        </div>
                      ) : (
                        <div className="dashboard-action-group">
                          <span className="processed-text">처리완료</span>
                          <button className="danger ghost" onClick={() => remove(row.id)}>삭제</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && <tr><td colSpan="7">표시할 예외 요청이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </DashboardLayout>
  );
}

export default ExceptionRequestsPage;
