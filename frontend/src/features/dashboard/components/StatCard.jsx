// 대시보드 통계 카드 컴포넌트
// 역할:
// 1) 전체 마스킹 건수, 오늘 마스킹 건수 같은 요약 지표 표시
// 2) 같은 카드 디자인을 여러 통계에 재사용
// 3) icon props로 lucide-react 아이콘 컴포넌트를 받아 화면에 표시
// 4) 백엔드 데이터가 들어와도 props만 바꾸면 그대로 사용 가능

function StatCard({ icon: Icon, title, value, description, accentText }) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        {/* lucide-react 아이콘 영역 */}
        <div className="stat-icon">
          {Icon && <Icon size={22} strokeWidth={2.3} />}
        </div>

        <span className="stat-accent">{accentText}</span>
      </div>

      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      <p className="stat-description">{description}</p>
    </article>
  );
}

export default StatCard;