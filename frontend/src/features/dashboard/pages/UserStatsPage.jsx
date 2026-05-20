import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getUserStats } from '../services/dashboardApi';
import '../dashboard.css';

function getRiskMeta(row) {
  if ((row.high_risk_count || 0) > 0) {
    return { label: '높음', className: 'high' };
  }
  if ((row.masked_count || 0) > 0) {
    return { label: '주의', className: 'medium' };
  }
  return { label: '낮음', className: 'low' };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function UserStatsPage() {
  const [rows, setRows] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserStats()
      .then(({ data }) => setRows(data))
      .catch((err) => setError(err.response?.data?.detail || '사용자 통계를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const names = rows
      .map((row) => row.department || '미지정')
      .filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [rows]);

  const visibleRows = useMemo(() => (
    rows.filter((row) => departmentFilter === 'all' || (row.department || '미지정') === departmentFilter)
  ), [departmentFilter, rows]);

  const summary = useMemo(() => {
    const totalUsers = visibleRows.length;
    const totalMasked = visibleRows.reduce((sum, row) => sum + Number(row.masked_count || 0), 0);
    const maskedUsers = visibleRows.filter((row) => Number(row.masked_count || 0) > 0).length;
    const highRiskUsers = visibleRows.filter((row) => Number(row.high_risk_count || 0) > 0).length;
    const totalConversations = visibleRows.reduce((sum, row) => sum + Number(row.conversation_count || 0), 0);
    const maskedRate = totalUsers > 0 ? Math.round((maskedUsers / totalUsers) * 100) : 0;

    return {
      totalUsers,
      totalMasked,
      maskedUsers,
      highRiskUsers,
      totalConversations,
      maskedRate,
    };
  }, [visibleRows]);

  const riskDistribution = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    visibleRows.forEach((row) => {
      counts[getRiskMeta(row).className] += 1;
    });
    const total = visibleRows.length || 1;
    return [
      { key: 'high', label: '높음', count: counts.high, color: '#ef4444' },
      { key: 'medium', label: '주의', count: counts.medium, color: '#f59e0b' },
      { key: 'low', label: '낮음', count: counts.low, color: '#3b82f6' },
    ].map((item) => ({
      ...item,
      pct: Math.round((item.count / total) * 100),
    }));
  }, [visibleRows]);

  return (
    <DashboardLayout
      title="사용자별 통계"
      description="사용자 단위의 대화, 메시지, 마스킹 발생량을 확인합니다."
    >
      {loading && <div className="dashboard-state">사용자 통계를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}

      <section className="user-stats-summary-grid">
        <article>
          <span>분석 사용자</span>
          <strong>{formatNumber(summary.totalUsers)}</strong>
        </article>
        <article>
          <span>마스킹 항목</span>
          <strong>{formatNumber(summary.totalMasked)}</strong>
        </article>
        <article>
          <span>마스킹 사용자</span>
          <strong>{formatNumber(summary.maskedUsers)}</strong>
        </article>
        <article>
          <span>위험도 높음</span>
          <strong>{formatNumber(summary.highRiskUsers)}</strong>
        </article>
      </section>

      <article className="dashboard-card dashboard-card-large">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>사용자별 마스킹 현황</h2>
            <p>총 {rows.length}명 중 {visibleRows.length}명 표시</p>
          </div>
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
        <div className="request-table-wrap">
          <table className="request-table user-stats-table">
            <thead>
              <tr>
                <th>사용자</th>
                <th>계정</th>
                <th>부서</th>
                <th>대화</th>
                <th>마스킹 메시지</th>
                <th>마스킹 항목</th>
                <th>위험도</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const risk = getRiskMeta(row);
                return (
                  <tr key={row.user_id}>
                    <td>{row.name || '-'}</td>
                    <td>{row.username}</td>
                    <td>{row.department || '-'}</td>
                    <td>{row.conversation_count}</td>
                    <td>{row.masked_message_count}</td>
                    <td>{row.masked_count}</td>
                    <td><span className={`risk-pill ${risk.className}`}>{risk.label}</span></td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && !loading && (
                <tr><td colSpan="7">표시할 사용자 통계가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <section className="dashboard-grid single user-stats-visual-grid">
        <article className="dashboard-card">
          <div className="dashboard-card-header">
            <h2>위험도 분포</h2>
          </div>
          <div className="user-risk-visual">
            <div className="user-risk-ring" style={{ '--masked-rate': `${summary.maskedRate}%` }}>
              <strong>{summary.maskedRate}%</strong>
              <span>마스킹 사용자</span>
            </div>
            <div className="user-risk-bars">
              {riskDistribution.map((item) => (
                <div className="user-risk-row" key={item.key}>
                  <span className="user-risk-label">{item.label}</span>
                  <div className="user-risk-track">
                    <div style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                  <strong>{formatNumber(item.count)}명</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </DashboardLayout>
  );
}

export default UserStatsPage;
