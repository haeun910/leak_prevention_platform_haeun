import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getUserStats } from '../services/dashboardApi';
import '../dashboard.css';

function UserStatsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserStats()
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.detail || '사용자 통계를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="사용자별 통계" description="사용자 단위의 대화, 메시지, 마스킹 발생량을 확인합니다.">
      {loading && <div className="dashboard-state">사용자 통계를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}
      <article className="dashboard-card dashboard-card-large">
        <div className="dashboard-card-header">
          <h2>사용자별 마스킹 현황</h2>
          <p>저장된 채팅 메시지의 마스킹 메타데이터 기준 집계입니다.</p>
        </div>
        <div className="request-table-wrap">
          <table className="request-table">
            <thead>
              <tr>
                <th>사용자</th>
                <th>계정</th>
                <th>부서</th>
                <th>대화</th>
                <th>메시지</th>
                <th>마스킹 메시지</th>
                <th>마스킹 항목</th>
                <th>고위험</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>{row.name || '-'}</td>
                  <td>{row.username}</td>
                  <td>{row.department || '-'}</td>
                  <td>{row.conversation_count}</td>
                  <td>{row.message_count}</td>
                  <td>{row.masked_message_count}</td>
                  <td>{row.masked_count}</td>
                  <td>{row.high_risk_count}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan="8">표시할 사용자 통계가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </DashboardLayout>
  );
}

export default UserStatsPage;
