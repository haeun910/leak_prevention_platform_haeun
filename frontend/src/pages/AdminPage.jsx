import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react'
import StatsCard from '../components/admin/StatsCard'
import LogTable from '../components/admin/LogTable'
import { getStats, getLogs } from '../api/client'

const PAGE_SIZE = 20

export default function AdminPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [page, setPage] = useState(1)
  const [riskFilter, setRiskFilter] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, logsRes] = await Promise.all([
        getStats(),
        getLogs({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, ...(riskFilter ? { risk_level: riskFilter } : {}) }),
      ])
      setStats(statsRes.data)
      setLogs(logsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, riskFilter])

  const totalPages = stats ? Math.ceil(stats.total_requests / PAGE_SIZE) : 1

  const topEntityTypes = stats
    ? Object.entries(stats.entity_type_breakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : []

  return (
    <div style={styles.root}>
      {/* 상단 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
          </button>
          <div style={styles.logoWrap}>
            <Shield size={18} color="var(--accent)" />
            <span style={styles.logoText}>SecureAI</span>
          </div>
          <span style={styles.divider}>/</span>
          <span style={styles.pageLabel}>관리자 대시보드</span>
        </div>
        <button style={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          새로고침
        </button>
      </header>

      <main style={styles.main}>
        {/* 통계 카드 */}
        <section style={styles.statsGrid}>
          <StatsCard
            label="전체 요청"
            value={stats?.total_requests?.toLocaleString()}
            sub="누적 API 호출 수"
          />
          <StatsCard
            label="마스킹 건수"
            value={stats?.total_masked?.toLocaleString()}
            sub="마스킹된 항목 합계"
            color="var(--accent)"
          />
          <StatsCard
            label="고위험 탐지"
            value={stats?.high_risk_count?.toLocaleString()}
            sub="HIGH 등급 이벤트"
            color="var(--risk-high)"
          />
          <StatsCard
            label="마스킹 비율"
            value={
              stats && stats.total_requests > 0
                ? `${((stats.masked_requests / stats.total_requests) * 100).toFixed(1)}%`
                : '-'
            }
            sub="마스킹 발생 요청 비율"
            color="var(--risk-medium)"
          />
        </section>

        {/* 엔티티 유형 분포 */}
        {topEntityTypes.length > 0 && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>엔티티 유형 상위 5개</h3>
            <div style={styles.barList}>
              {topEntityTypes.map(([type, count]) => {
                const max = topEntityTypes[0][1]
                return (
                  <div key={type} style={styles.barRow}>
                    <span style={styles.barLabel}>{type}</span>
                    <div style={styles.barTrack}>
                      <div style={{
                        ...styles.barFill,
                        width: `${(count / max) * 100}%`,
                      }} />
                    </div>
                    <span style={styles.barCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 로그 테이블 */}
        <section style={styles.section}>
          <LogTable
            logs={logs}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onRiskFilter={(f) => { setRiskFilter(f); setPage(1) }}
            riskFilter={riskFilter}
          />
        </section>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-base)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: 'var(--header-h)',
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  backBtn: {
    background: 'none',
    color: 'var(--text-secondary)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  divider: {
    color: 'var(--text-muted)',
    fontSize: '16px',
  },
  pageLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '7px 13px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background var(--transition)',
  },
  main: {
    flex: 1,
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
  },
  section: {},
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '14px',
    letterSpacing: '-0.01em',
  },
  barList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  barLabel: {
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    width: '120px',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '6px',
    background: 'var(--bg-hover)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'var(--accent)',
    borderRadius: '3px',
    transition: 'width 0.6s ease',
  },
  barCount: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    width: '32px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
}
