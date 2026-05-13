import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import PeriodFilter from '../components/PeriodFilter';
import CategoryStatsCard from '../components/CategoryStatsCard';
import DepartmentStatsCard from '../components/DepartmentStatsCard';
import RecentRequestsTable from '../components/RecentRequestsTable';
import useDashboardData from '../hooks/useDashboardData';
import '../dashboard.css';

function DashboardHome() {
  const {
    period,
    setPeriod,
    summary,
    maskingStats,
    categories,
    departments,
    recentRequests,
    loading,
    error,
  } = useDashboardData();

  const maxMaskingCount = Math.max(...maskingStats.map((item) => item.count), 1);

  return (
    <DashboardLayout
      title="대시보드"
      description="플랫폼에서 감지한 민감정보 마스킹 현황을 확인합니다."
    >
      {loading && <div className="dashboard-state">대시보드 데이터를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}

      <section className="stat-grid">
        {summary.map((item) => (
          <StatCard
            key={item.id}
            icon={item.icon}
            title={item.title}
            value={item.value}
            description={item.description}
            accentText={item.accentText}
          />
        ))}
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>마스킹 통계</h2>
            <p>일간, 월간, 연간 단위로 마스킹 발생량을 확인합니다.</p>
          </div>

          <PeriodFilter period={period} onChangePeriod={setPeriod} />
        </div>

        <div className="masking-chart">
          {maskingStats.map((item) => (
            <div className="bar-row" key={item.label}>
              <span className="bar-label">{item.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.count / maxMaskingCount) * 100}%` }}
                />
              </div>
              <span className="bar-value">{item.count}건</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <CategoryStatsCard categories={categories} />
        <DepartmentStatsCard departments={departments} />
      </section>

      <section className="dashboard-grid single">
        <RecentRequestsTable requests={recentRequests} />
      </section>
    </DashboardLayout>
  );
}

export default DashboardHome;
