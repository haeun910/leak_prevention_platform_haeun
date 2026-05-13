import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getDepartmentStats } from '../services/dashboardApi';
import '../dashboard.css';

function DepartmentStatsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDepartmentStats()
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.detail || '부서 통계를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const max = Math.max(...rows.map((row) => row.masked_count), 1);

  return (
    <DashboardLayout title="부서별 통계" description="부서별 민감정보 탐지와 마스킹 발생량을 비교합니다.">
      {loading && <div className="dashboard-state">부서 통계를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}
      <section className="dashboard-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>부서별 마스킹 항목</h2>
            <p>부서별 누적 마스킹 항목 수</p>
          </div>
          <div className="department-list">
            {rows.map((row) => (
              <div className="department-row" key={row.department}>
                <div className="department-top">
                  <span>{row.department}</span>
                  <strong>{row.masked_count}건</strong>
                </div>
                <div className="department-track">
                  <div className="department-fill" style={{ width: `${(row.masked_count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card dashboard-card-large">
          <div className="dashboard-card-header">
            <h2>부서별 상세</h2>
            <p>사용자, 대화, 메시지 기준 상세 지표</p>
          </div>
          <div className="request-table-wrap">
            <table className="request-table">
              <thead>
                <tr>
                  <th>부서</th>
                  <th>사용자</th>
                  <th>대화</th>
                  <th>메시지</th>
                  <th>마스킹 메시지</th>
                  <th>마스킹 항목</th>
                  <th>고위험</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.department}>
                    <td>{row.department}</td>
                    <td>{row.user_count}</td>
                    <td>{row.conversation_count}</td>
                    <td>{row.message_count}</td>
                    <td>{row.masked_message_count}</td>
                    <td>{row.masked_count}</td>
                    <td>{row.high_risk_count}</td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr><td colSpan="7">표시할 부서 통계가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </DashboardLayout>
  );
}

export default DepartmentStatsPage;
