// 부서별 마스킹 통계 카드 컴포넌트
// 역할:
// 1) 부서별 마스킹 발생 건수 표시
// 2) 어느 부서에서 민감정보 마스킹이 많이 발생하는지 확인 가능
// 3) 추후 부서별 마스킹 정책 차등 적용 기능과 연결 가능
function DepartmentStatsCard({ departments }) {
  const maxCount = Math.max(...departments.map((item) => item.count), 1);

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>부서별 마스킹 현황</h2>
        <p>부서별 민감정보 탐지 발생량</p>
      </div>

      <div className="department-list">
        {departments.map((item) => (
          <div className="department-row" key={item.department}>
            <div className="department-top">
              <span>{item.department}</span>
              <strong>{item.count}건</strong>
            </div>

            <div className="department-track">
              <div
                className="department-fill"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default DepartmentStatsCard;