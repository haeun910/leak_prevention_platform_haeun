// 대시보드 기간 필터 컴포넌트
// 역할:
// 1) 일간 / 월간 / 연간 통계 보기 버튼 표시
// 2) 사용자가 선택한 기간 값을 부모 컴포넌트로 전달
// 3) 회의에서 나온 "연 / 월 / 일 단위로 통계 보기" 요구사항을 담당
function PeriodFilter({ period, onChangePeriod }) {
  const periodOptions = [
    { label: '일간', value: 'day' },
    { label: '월간', value: 'month' },
    { label: '연간', value: 'year' }
  ];

  return (
    <div className="period-filter">
      {periodOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`period-filter-btn ${period === option.value ? 'active' : ''}`}
          onClick={() => onChangePeriod(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default PeriodFilter;