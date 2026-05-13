import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { getSecurityLogs } from '../services/dashboardApi';
import '../dashboard.css';

const riskLabels = {
  high: '높음',
  medium: '중간',
  low: '낮음',
  none: '없음',
};

function SecurityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [risk, setRisk] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    getSecurityLogs({ limit: 100, ...(risk ? { risk_level: risk } : {}) })
      .then(({ data }) => setLogs(data))
      .catch((err) => setError(err.response?.data?.detail || '보안 이력을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [risk]);

  const summary = useMemo(() => ({
    total: logs.length,
    masked: logs.filter((log) => log.was_masked).length,
    high: logs.filter((log) => String(log.risk_level || '').toLowerCase() === 'high').length,
    entities: logs.reduce((sum, log) => sum + (log.masked_count || 0), 0),
  }), [logs]);

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout title="보안 현황 이력" description="마스킹 탐지, 위험도, 처리 단계별 이력을 확인합니다.">
      {error && <div className="dashboard-state error">{error}</div>}
      <section className="security-summary-grid">
        <article>
          <FileText size={20} />
          <span>전체 요청</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <ShieldCheck size={20} />
          <span>마스킹 적용</span>
          <strong>{summary.masked}</strong>
        </article>
        <article>
          <AlertTriangle size={20} />
          <span>고위험</span>
          <strong>{summary.high}</strong>
        </article>
        <article>
          <ShieldCheck size={20} />
          <span>탐지 엔티티</span>
          <strong>{summary.entities}</strong>
        </article>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>보안 이벤트 로그</h2>
            <p>최근 100건 기준으로 마스킹 파이프라인 처리 이력을 표시합니다.</p>
          </div>
          <div className="exception-filter">
            <button className={risk === '' ? 'active' : ''} onClick={() => setRisk('')}>전체</button>
            <button className={risk === 'high' ? 'active' : ''} onClick={() => setRisk('high')}>높음</button>
            <button className={risk === 'medium' ? 'active' : ''} onClick={() => setRisk('medium')}>중간</button>
            <button className={risk === 'low' ? 'active' : ''} onClick={() => setRisk('low')}>낮음</button>
          </div>
        </div>

        {loading ? <div className="dashboard-state">불러오는 중입니다.</div> : (
          <div className="request-table-wrap">
            <table className="request-table security-log-table">
              <thead>
                <tr>
                  <th>시각</th>
                  <th>위험도</th>
                  <th>탐지 유형</th>
                  <th>단계</th>
                  <th>마스킹 수</th>
                  <th>입력 길이</th>
                  <th>세션</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.timestamp)}</td>
                    <td><span className={`risk-pill ${String(log.risk_level || 'none').toLowerCase()}`}>{riskLabels[String(log.risk_level || 'none').toLowerCase()] || log.risk_level}</span></td>
                    <td>{log.entity_types || '-'}</td>
                    <td>{log.detection_stage || '-'}</td>
                    <td>{log.masked_count || 0}</td>
                    <td>{log.input_length || 0}</td>
                    <td className="muted-cell">{log.session_id || '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan="7">표시할 보안 이력이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default SecurityLogsPage;
