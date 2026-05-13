// 카테고리별 마스킹 통계 카드 컴포넌트
// 역할:
// 1) 이메일, 전화번호, 주민등록번호 등 탐지된 마스킹 카테고리별 누적 건수 표시
// 2) 어떤 카테고리가 가장 많이 탐지되었는지 한눈에 확인 가능
// 3) 추후 백엔드의 categoryStats API 응답과 연결 가능
function CategoryStatsCard({ categories }) {
  const maxCount = Math.max(...categories.map((item) => item.count), 1);

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>카테고리별 마스킹 통계</h2>
        <p>탐지된 민감정보 유형별 누적 건수</p>
      </div>

      <div className="category-stat-list">
        {categories.map((item) => (
          <div className="category-stat-row" key={item.category}>
            <div className="category-stat-top">
              <span>{item.category}</span>
              <strong>{item.count}건</strong>
            </div>

            <div className="category-stat-track">
              <div
                className="category-stat-fill"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default CategoryStatsCard;