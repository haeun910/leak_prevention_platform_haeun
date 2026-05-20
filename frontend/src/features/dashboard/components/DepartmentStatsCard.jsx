function Donut({ data, selectedName, onSelectDepartment }) {
  const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
  let offset = 0;

  const handleKeyDown = (event, item) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectDepartment?.(item);
    }
  };

  return (
    <div className="breakdown-donut department-donut">
      <svg viewBox="0 0 42 42" aria-label="부서별 마스킹 비중">
        <circle className="donut-bg" cx="21" cy="21" r="15.915" />
        {data.map((item) => {
          const value = (item.count / total) * 100;
          const segment = (
            <circle
              className={selectedName === item.department ? 'active' : ''}
              cx="21"
              cy="21"
              key={item.department}
              onClick={() => onSelectDepartment?.(item)}
              onKeyDown={(event) => handleKeyDown(event, item)}
              r="15.915"
              role="button"
              stroke={item.color}
              tabIndex={0}
              aria-label={`${item.department} ${item.count.toLocaleString()}건 보기`}
              strokeDasharray={`${value} ${100 - value}`}
              strokeDashoffset={-offset}
            />
          );
          offset += value;
          return segment;
        })}
      </svg>
      <div className="breakdown-donut-center">
        <strong>{total.toLocaleString()}</strong>
        <span>건</span>
      </div>
    </div>
  );
}

function DepartmentStatsCard({ departments, selectedDepartment, onSelectDepartment }) {
  return (
    <article className="dashboard-card breakdown-card">
      <div className="dashboard-card-header">
        <h2>부서별 마스킹 현황</h2>
      </div>

      <Donut
        data={departments}
        selectedName={selectedDepartment}
        onSelectDepartment={onSelectDepartment}
      />
    </article>
  );
}

export default DepartmentStatsCard;
