import RiskBadge from '../chat/RiskBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function LogTable({ logs, page, totalPages, onPageChange, onRiskFilter, riskFilter }) {
  const RISK_OPTIONS = ['전체', 'high', 'medium', 'low']

  return (
    <div style={styles.wrap}>
      {/* 필터 */}
      <div style={styles.toolbar}>
        <h3 style={styles.tableTitle}>마스킹 로그</h3>
        <div style={styles.filters}>
          {RISK_OPTIONS.map(r => (
            <button
              key={r}
              style={{
                ...styles.filterBtn,
                background: riskFilter === r ? 'var(--accent-subtle)' : 'none',
                color: riskFilter === r ? 'var(--accent)' : 'var(--text-secondary)',
                borderColor: riskFilter === r ? 'rgba(59,130,246,0.3)' : 'var(--border)',
              }}
              onClick={() => onRiskFilter(r === '전체' ? null : r)}
            >
              {r === '전체' ? '전체' : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['시각', '세션', '탐지 단계', '엔티티 유형', '항목 수', '위험도'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.empty}>로그가 없습니다.</td>
              </tr>
            ) : logs.map(log => (
              <tr key={log.id} style={styles.tr}>
                <td style={styles.td}>
                  {log.timestamp.replace('T', ' ').slice(0, 19)}
                </td>
                <td style={{ ...styles.td, ...styles.mono }}>{log.session_id.slice(0, 12)}...</td>
                <td style={{ ...styles.td, ...styles.mono }}>{log.detection_stage}</td>
                <td style={styles.td}>
                  <div style={styles.tags}>
                    {log.entity_types.split(',').map(t => (
                      <span key={t} style={styles.tag}>{t.trim()}</span>
                    ))}
                  </div>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{log.masked_count}</td>
                <td style={styles.td}><RiskBadge level={log.risk_level} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button style={styles.pageBtn} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft size={14} />
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button style={styles.pageBtn} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  },
  tableTitle: {
    fontSize: '14px',
    fontWeight: 600,
  },
  filters: {
    display: 'flex',
    gap: '6px',
  },
  filterBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.03em',
    transition: 'all var(--transition)',
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
  },
  td: {
    padding: '11px 16px',
    color: 'var(--text-secondary)',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  mono: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
  },
  tags: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  tag: {
    padding: '2px 7px',
    background: 'var(--accent-subtle)',
    color: 'var(--accent)',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    fontFamily: 'var(--font-mono)',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-muted)',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '14px',
    borderTop: '1px solid var(--border)',
  },
  pageBtn: {
    background: 'var(--bg-hover)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '5px 8px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    minWidth: '48px',
    textAlign: 'center',
  },
}
