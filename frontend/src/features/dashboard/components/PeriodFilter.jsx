function PeriodFilter({ period, onChangePeriod }) {
  const periodOptions = [
    { label: '일간', value: 'day' },
    { label: '월간', value: 'month' },
    { label: '연간', value: 'year' },
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
