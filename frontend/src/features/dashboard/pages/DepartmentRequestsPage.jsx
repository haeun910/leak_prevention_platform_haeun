import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  getDepartmentChangeRequests,
  updateDepartmentChangeRequest,
} from '../services/dashboardApi';
import '../dashboard.css';

function DepartmentRequestsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getDepartmentChangeRequests()
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.detail || '부서 변경 요청을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id, status) => {
    await updateDepartmentChangeRequest(id, { status });
    load();
  };

  const formatDate = (value) => (value ? value.slice(0, 10) : '-');
  const statusLabel = (status) => {
    if (status === 'approved') return '승인';
    if (status === 'rejected') return '거절';
    return '대기중';
  };

  return (
    <DashboardLayout
      title="부서 변경 요청"
      description="사용자가 설정에서 요청한 부서 변경을 검토하고 승인합니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}
      <article className="dashboard-card dashboard-card-large exception-management-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>요청 목록</h2>
            <p>승인하면 사용자 계정의 부서가 즉시 변경됩니다.</p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-state">불러오는 중입니다.</div>
        ) : (
          <div className="request-table-wrap">
            <table className="request-table exception-table">
              <thead>
                <tr>
                  <th>요청자</th>
                  <th>현재 부서</th>
                  <th>요청 부서</th>
                  <th>사유</th>
                  <th>요청일</th>
                  <th>상태</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.requester || '-'}</td>
                    <td>{row.current_department || '-'}</td>
                    <td className="exception-keyword-cell">{row.requested_department}</td>
                    <td>{row.reason || '-'}</td>
                    <td className="muted-cell">{formatDate(row.created_at)}</td>
                    <td>
                      <span className={`exception-status ${row.status}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      {row.status === 'pending' ? (
                        <div className="dashboard-action-group">
                          <button type="button" onClick={() => changeStatus(row.id, 'approved')}>
                            승인
                          </button>
                          <button className="danger" type="button" onClick={() => changeStatus(row.id, 'rejected')}>
                            거절
                          </button>
                        </div>
                      ) : (
                        <span className="processed-text">처리완료</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="7">표시할 부서 변경 요청이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </DashboardLayout>
  );
}

export default DepartmentRequestsPage;
