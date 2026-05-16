import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getDepartmentStats, getUserStats } from '../services/dashboardApi';
import '../dashboard.css';

function getRiskMeta(row) {
  if ((row.high_risk_count || 0) > 0) return { label: '높음', className: 'high' };
  if ((row.masked_count || 0) > 0) return { label: '주의', className: 'medium' };
  return { label: '낮음', className: 'low' };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function DepartmentStatsPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDepartmentStats(), getUserStats()])
      .then(([departmentRes, userRes]) => {
        setRows(departmentRes.data);
        setUsers(userRes.data);
      })
      .catch((err) => setError(err.response?.data?.detail || '부서 통계를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const max = Math.max(...rows.map((row) => row.masked_count), 1);
  const topMaskedDepartments = rows.slice(0, 5);
  const topRiskDepartments = [...rows]
    .sort((a, b) => Number(b.high_risk_count || 0) - Number(a.high_risk_count || 0))
    .slice(0, 5);
  const summary = useMemo(() => ({
    departments: rows.length,
    users: rows.reduce((sum, row) => sum + Number(row.user_count || 0), 0),
    masked: rows.reduce((sum, row) => sum + Number(row.masked_count || 0), 0),
    highRisk: rows.reduce((sum, row) => sum + Number(row.high_risk_count || 0), 0),
  }), [rows]);
  const selectedRow = rows.find((row) => row.department === selectedDepartment);
  const departmentUsers = useMemo(() => (
    selectedDepartment
      ? users
          .filter((user) => (user.department || '미지정') === selectedDepartment)
          .sort((a, b) => Number(b.masked_count || 0) - Number(a.masked_count || 0))
      : []
  ), [selectedDepartment, users]);
  const toggleDepartment = (department) => {
    setSelectedDepartment((current) => (current === department ? '' : department));
  };

  return (
    <DashboardLayout
      title="부서별 통계"
      description="부서별 민감정보 감지 및 마스킹 발생량을 비교합니다."
    >
      {loading && <div className="dashboard-state">부서 통계를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}

      <section className="department-summary-grid">
        <article>
          <span>분석 부서</span>
          <strong>{formatNumber(summary.departments)}</strong>
        </article>
        <article>
          <span>사용자</span>
          <strong>{formatNumber(summary.users)}</strong>
        </article>
        <article>
          <span>마스킹 항목</span>
          <strong>{formatNumber(summary.masked)}</strong>
        </article>
        <article>
          <span>고위험</span>
          <strong>{formatNumber(summary.highRisk)}</strong>
        </article>
      </section>

      <section className="dashboard-grid department-visual-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>마스킹 항목 Top 5 부서</h2>
          </div>
          <div className="department-rank-chart">
            {topMaskedDepartments.map((row) => (
              <button
                className={`department-rank-row ${selectedDepartment === row.department ? 'active' : ''}`}
                key={row.department}
                onClick={() => toggleDepartment(row.department)}
                type="button"
              >
                <span>{row.department}</span>
                <div>
                  <i style={{ width: `${(row.masked_count / max) * 100}%` }} />
                </div>
                <strong>{formatNumber(row.masked_count)}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>고위험 발생 Top 5 부서</h2>
          </div>
          <div className="department-rank-chart">
            {topRiskDepartments.map((row) => {
              const riskMax = Math.max(...topRiskDepartments.map((item) => item.high_risk_count), 1);
              return (
                <button
                  className={`department-rank-row risk ${selectedDepartment === row.department ? 'active' : ''}`}
                  key={row.department}
                  onClick={() => toggleDepartment(row.department)}
                  type="button"
                >
                  <span>{row.department}</span>
                  <div>
                    <i style={{ width: `${(row.high_risk_count / riskMax) * 100}%` }} />
                  </div>
                  <strong>{formatNumber(row.high_risk_count)}</strong>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>부서별 마스킹 항목</h2>
          </div>
          <div className="department-list">
            {rows.map((row) => (
              <button
                className={`department-row ${selectedDepartment === row.department ? 'active' : ''}`}
                key={row.department}
                  onClick={() => toggleDepartment(row.department)}
                type="button"
              >
                <div className="department-top">
                  <span>{row.department}</span>
                  <strong>{row.masked_count}건</strong>
                </div>
                <div className="department-track">
                  <div className="department-fill" style={{ width: `${(row.masked_count / max) * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="dashboard-card dashboard-card-large">
          <div className="dashboard-card-header">
            <h2>부서별 상세</h2>
          </div>
          <div className="request-table-wrap">
            <table className="request-table department-stats-table">
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

      {selectedRow && (
        <section className="dashboard-card department-detail-card">
          <div className="dashboard-card-header">
            <h2>{selectedDepartment} 사용자 마스킹 현황</h2>
          </div>

          <div className="department-detail-summary">
            <article>
              <span>사용자</span>
              <strong>{selectedRow.user_count}</strong>
            </article>
            <article>
              <span>대화</span>
              <strong>{selectedRow.conversation_count}</strong>
            </article>
            <article>
              <span>마스킹 메시지</span>
              <strong>{selectedRow.masked_message_count}</strong>
            </article>
            <article>
              <span>마스킹 항목</span>
              <strong>{selectedRow.masked_count}</strong>
            </article>
            <article>
              <span>위험도 높음</span>
              <strong>{selectedRow.high_risk_count}</strong>
            </article>
          </div>

          <div className="request-table-wrap">
            <table className="request-table department-user-table">
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>계정</th>
                  <th>마스킹 메시지</th>
                  <th>마스킹 건수</th>
                  <th>위험도</th>
                </tr>
              </thead>
              <tbody>
                {departmentUsers.map((user) => {
                  const risk = getRiskMeta(user);
                  return (
                    <tr key={user.user_id}>
                      <td>{user.name || '-'}</td>
                      <td>{user.username}</td>
                      <td>{user.masked_message_count}</td>
                      <td>{user.masked_count}</td>
                      <td><span className={`risk-pill ${risk.className}`}>{risk.label}</span></td>
                    </tr>
                  );
                })}
                {departmentUsers.length === 0 && (
                  <tr><td colSpan="5">표시할 부서 사용자가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}

export default DepartmentStatsPage;
