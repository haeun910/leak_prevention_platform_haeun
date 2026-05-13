import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import PeriodFilter from '../components/PeriodFilter';
import CategoryStatsCard from '../components/CategoryStatsCard';
import DepartmentStatsCard from '../components/DepartmentStatsCard';
import RecentRequestsTable from '../components/RecentRequestsTable';
import useDashboardData from '../hooks/useDashboardData';
import '../dashboard.css';

// 관리자 대시보드 홈 페이지
// 역할:
// 1) 대시보드 홈 화면 전체를 조립
// 2) 통계 카드, 기간 필터, 카테고리 통계, 부서별 통계, 최근 예외 요청 테이블을 표시
// 3) 실제 데이터 처리 로직은 useDashboardData.js에서 관리
// 4) 각 UI 영역은 개별 컴포넌트로 분리하여 유지보수성을 높임
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
    error
  } = useDashboardData();

  const maxMaskingCount = Math.max(
    ...maskingStats.map((item) => item.count),
    1
  );

  return (
    <DashboardLayout
      title="대시보드 홈"
      description="프롬프트에서 탐지된 민감정보 마스킹 현황을 확인합니다."
    >
      {loading && <div className="dashboard-state">대시보드 데이터를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}

      {/* 상단 요약 통계 카드 */}
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

      {/* 기간 필터 및 마스킹 추이 */}
      <section className="dashboard-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>마스킹 통계량</h2>
            <p>일간 / 월간 / 연간 단위로 마스킹 발생량을 확인합니다.</p>
          </div>

          <PeriodFilter
            period={period}
            onChangePeriod={setPeriod}
          />
        </div>

        <div className="masking-chart">
          {maskingStats.map((item) => (
            <div className="bar-row" key={item.label}>
              <span className="bar-label">{item.label}</span>

              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(item.count / maxMaskingCount) * 100}%`
                  }}
                ></div>
              </div>

              <span className="bar-value">{item.count}건</span>
            </div>
          ))}
        </div>
      </section>

      {/* 카테고리별 통계 / 부서별 통계 */}
      <section className="dashboard-grid">
        <CategoryStatsCard categories={categories} />
        <DepartmentStatsCard departments={departments} />
      </section>

      {/* 최근 사용자 피드백 및 예외 요청 */}
      <section className="dashboard-grid single">
        <RecentRequestsTable requests={recentRequests} />
      </section>
    </DashboardLayout>
  );
}

export default DashboardHome;
