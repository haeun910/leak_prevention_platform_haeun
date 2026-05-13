// 최근 사용자 피드백 / 예외 요청 테이블 컴포넌트
// 역할:
// 1) 사용자가 요청한 마스킹 예외 키워드 목록 표시
// 2) 요청자, 부서, 사유, 상태를 테이블 형태로 표시
// 3) 추후 승인 / 거절 기능으로 확장 가능
function RecentRequestsTable({ requests }) {
  return (
    <article className="dashboard-card dashboard-card-large">
      <div className="dashboard-card-header">
        <h2>최근 마스킹 로그</h2>
        <p>백엔드에 기록된 최근 탐지 및 마스킹 처리 이력</p>
      </div>

      <div className="request-table-wrap">
        <table className="request-table">
          <thead>
            <tr>
              <th>탐지 유형</th>
              <th>세션</th>
              <th>위험도</th>
              <th>처리 내용</th>
              <th>상태</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.keyword}</td>
                <td>{request.requester}</td>
                <td>{request.department}</td>
                <td>{request.reason}</td>
                <td>
                  <span
                    className={`status-badge ${
                      ['high', 'medium'].includes(String(request.status).toLowerCase())
                        ? 'rejected'
                        : String(request.status).toLowerCase() === 'low'
                          ? 'pending'
                          : 'approved'
                    }`}
                  >
                    {String(request.status || 'none').toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default RecentRequestsTable;
