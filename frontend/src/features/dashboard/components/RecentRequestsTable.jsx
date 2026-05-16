function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function riskMeta(level) {
  const risk = String(level || 'none').toLowerCase();
  if (risk === 'high') {
    return {
      label: '높음',
      className: 'high',
      action: '원문 확인 및 정책 검토',
      note: '다중 민감정보 또는 고위험 항목 포함',
    };
  }
  if (risk === 'medium') {
    return {
      label: '중간',
      className: 'medium',
      action: '반복 발생 여부 확인',
      note: '업무 문맥 확인 권장',
    };
  }
  if (risk === 'low') {
    return {
      label: '낮음',
      className: 'low',
      action: '자동 처리 완료',
      note: '일반 마스킹 로그',
    };
  }
  return {
    label: '없음',
    className: 'approved',
    action: '추가 조치 없음',
    note: '마스킹 항목 없음',
  };
}

function RecentRequestsTable({ requests, totalCount = requests.length }) {
  const highCount = requests.filter((request) => String(request.riskLevel).toLowerCase() === 'high').length;
  const totalMasked = requests.reduce((sum, request) => sum + Number(request.maskedCount || 0), 0);

  return (
    <article className="dashboard-card dashboard-card-large recent-log-card">
      <div className="dashboard-card-header dashboard-card-header-row">
        <div>
          <h2>최근 마스킹 로그</h2>
        </div>
        <div className="recent-log-summary">
          <span>홈 표시 {requests.length}건 / 전체 {totalCount}건</span>
          <strong>마스킹 {totalMasked.toLocaleString()}개 · 고위험 {highCount}건</strong>
        </div>
      </div>

      <div className="request-table-wrap">
        <table className="request-table recent-log-table">
          <thead>
            <tr>
              <th>시간</th>
              <th>탐지 유형</th>
              <th>마스킹 수</th>
              <th>상태</th>
              <th>관리자 확인 포인트</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => {
              const meta = riskMeta(request.riskLevel);
              return (
                <tr key={request.id}>
                  <td className="log-time-cell" data-label="시간">{formatDateTime(request.timestamp)}</td>
                  <td className="log-type-cell" data-label="탐지 유형">{request.keyword}</td>
                  <td className="log-count-cell" data-label="마스킹 수">
                    {Number(request.maskedCount || 0).toLocaleString()}개
                  </td>
                  <td className="log-status-cell" data-label="상태">
                    <span className={`status-badge ${meta.className}`}>
                      {meta.label}
                    </span>
                  </td>
                  <td data-label="확인 포인트">
                    <strong className="log-action">{meta.action}</strong>
                    <span className="log-note">{meta.note}</span>
                  </td>
                </tr>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan="5">표시할 최근 마스킹 로그가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default RecentRequestsTable;
