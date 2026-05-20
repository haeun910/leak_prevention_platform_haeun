import { useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatCard from '../components/StatCard';
import PeriodFilter from '../components/PeriodFilter';
import CategoryStatsCard from '../components/CategoryStatsCard';
import DepartmentStatsCard from '../components/DepartmentStatsCard';
import useDashboardData from '../hooks/useDashboardData';
import { formatEntityTypes, isDeprecatedEntityType, labelEntityType } from '../../../utils/entityLabels';
import '../dashboard.css';

function getEntityBreakdown(logs) {
  const counter = {};
  logs.forEach((log) => {
    if (!log.entity_types) return;
    const types = String(log.entity_types).split(',');
    types.forEach((raw) => {
      const t = raw.trim();
      if (!t || isDeprecatedEntityType(t)) return;
      const label = labelEntityType(t) || t;
      counter[label] = (counter[label] || 0) + (log.masked_count || 1);
    });
  });
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
}

function isToday(timestamp) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function isThisMonth(timestamp) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatLogDate(timestamp) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${min}`;
}

function getPeriodLabel(period) {
  if (period === 'month') return '월간 상세';
  if (period === 'year') return '연간 상세';
  return '일간 상세';
}

function logMatchesPeriod(log, period, label) {
  if (!log.timestamp) return false;
  const date = new Date(log.timestamp);
  if (period === 'day') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}` === label;
  }
  if (period === 'month') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}` === label;
  }
  return String(date.getFullYear()) === label;
}

function TrendLine({ data, selectedLabel, onSelectPoint }) {
  const width = 720;
  const height = 180;
  const padding = 28;
  const max = Math.max(...data.map((item) => item.count), 1);
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = padding + step * index;
    const y = height - padding - (item.count / max) * (height - padding * 2);
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath =
    points.length > 1
      ? [
          `M ${points[0].x} ${height - padding}`,
          ...points.map((p) => `L ${p.x} ${p.y}`),
          `L ${points[points.length - 1].x} ${height - padding}`,
          'Z',
        ].join(' ')
      : '';

  return (
    <div className="trend-chart" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${padding} ${height - padding} H ${width - padding}`} />
        <path d={`M ${padding} ${padding} V ${height - padding}`} />
        {areaPath && <path className="trend-area" d={areaPath} />}
        <polyline points={polyline} />
        {points.map((point) => (
          <g
            key={point.label}
            onClick={() => onSelectPoint?.(point.label)}
            style={{ cursor: onSelectPoint ? 'pointer' : 'default' }}
          >
            <circle
              className={selectedLabel === point.label ? 'active' : ''}
              cx={point.x}
              cy={point.y}
              r="5"
            />
            <text x={point.x} y={height - 7} textAnchor="middle">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RiskDistributionBar({ logs }) {
  const riskMap = { high: 0, medium: 0, low: 0, none: 0 };
  logs.forEach((log) => {
    const level = log.risk_level || 'none';
    if (level in riskMap) riskMap[level] += 1;
    else riskMap.none += 1;
  });
  const total = Object.values(riskMap).reduce((a, b) => a + b, 0) || 1;
  const items = [
    { key: 'high', label: '고위험', color: '#ef4444' },
    { key: 'medium', label: '중위험', color: '#f59e0b' },
    { key: 'low', label: '저위험', color: '#3b82f6' },
    { key: 'none', label: '정상', color: '#94a3b8' },
  ].map((item) => ({
    ...item,
    count: riskMap[item.key],
    pct: Math.round((riskMap[item.key] / total) * 100),
  }));

  return (
    <div className="risk-dist">
      <div className="risk-dist-header">
        <span>위험도 분포</span>
        <span className="risk-dist-total">최근 {total}건 기준</span>
      </div>
      <div className="risk-dist-bar">
        {items
          .filter((i) => i.count > 0)
          .map((item) => (
            <div
              key={item.key}
              className="risk-dist-segment"
              style={{ width: `${(item.count / total) * 100}%`, background: item.color }}
              title={`${item.label}: ${item.count}건 (${item.pct}%)`}
            />
          ))}
      </div>
      <div className="risk-dist-legend">
        {items.map((item) => (
          <div className="risk-dist-item" key={item.key}>
            <span className="risk-dist-dot" style={{ background: item.color }} />
            <span className="risk-dist-name">{item.label}</span>
            <strong>{formatNumber(item.count)}건</strong>
            <span className="risk-dist-pct">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopUsersCard({ users, onSelectUser }) {
  const top = [...users]
    .filter((u) => u.maskedCount > 0)
    .sort((a, b) => b.maskedCount - a.maskedCount)
    .slice(0, 5);
  const maxCount = Math.max(...top.map((u) => u.maskedCount), 1);

  if (top.length === 0) return null;

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <h2>마스킹 상위 사용자 Top 5</h2>
        <p>전체 기간 마스킹 활동 기준</p>
      </div>
      <div className="top-users-list">
        {top.map((user, i) => (
          <button
            key={user.id || user.username}
            className="top-user-row"
            onClick={() => onSelectUser?.(user)}
            type="button"
          >
            <span className={`top-user-rank rank-${i < 3 ? i + 1 : 'rest'}`}>{i + 1}</span>
            <div className="top-user-info">
              <strong>{user.name || user.username}</strong>
              <span>{user.department || '미지정'}</span>
            </div>
            <div className="top-user-bar-track">
              <div
                className="top-user-bar-fill"
                style={{ width: `${(user.maskedCount / maxCount) * 100}%` }}
              />
            </div>
            <div className="top-user-nums">
              <strong>{formatNumber(user.maskedCount)}건</strong>
              {user.highRiskCount > 0 && (
                <span className="top-user-risk-badge">고위험 {user.highRiskCount}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}

const RISK_LEVEL_LABELS = { high: '고위험', medium: '중위험', low: '저위험', none: '정상' };
const RISK_LEVEL_CLS = { high: 'risk-pill high', medium: 'risk-pill medium', low: 'risk-pill low', none: 'risk-pill none' };

function DetailPanel({ insight, recentLogs, totalMasked, onClose }) {
  if (!insight) return null;

  const relatedLogs = recentLogs.filter(insight.matchLog).slice(0, 5);
  const share = totalMasked > 0 ? Math.round((insight.count / totalMasked) * 100) : 0;
  const breakdownMax = Math.max(...(insight.breakdown || []).map((item) => item.value), 1);
  const hasContent = insight.count > 0 || insight.breakdown.some((item) => item.value > 0) || (insight.users?.length > 0);

  return (
    <section className="dashboard-card insight-panel">
      <div className="insight-panel-header">
        <div className="insight-panel-header-left">
          <span className="insight-tag">{insight.kicker}</span>
          <div className="insight-title-row">
            <h3>{insight.title}</h3>
            <div className="insight-count">
              <strong>{formatNumber(insight.count)}</strong>
              <span>건</span>
              {share > 0 && <em>전체의 {share}%</em>}
            </div>
          </div>
        </div>
        <button className="insight-close-btn" type="button" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      {!hasContent ? (
        <p className="insight-empty">이 기간에 탐지된 데이터가 없습니다.</p>
      ) : (
        <>
          {insight.breakdown.length > 0 && (
            <div className="insight-section">
              <p className="insight-section-label">항목별 현황</p>
              <ul className="insight-breakdown-list">
                {insight.breakdown.map((item) => (
                  <li key={item.label} className="insight-breakdown-row">
                    <span className="insight-breakdown-name">{item.label}</span>
                    <div className="insight-breakdown-bar">
                      <div style={{ width: `${(item.value / breakdownMax) * 100}%` }} />
                    </div>
                    <strong className="insight-breakdown-val">{formatNumber(item.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.users?.length > 0 && (
            <div className="insight-section">
              <p className="insight-section-label">구성원</p>
              <div className="insight-user-list">
                {insight.users.map((user) => (
                  <div key={user.id || user.username} className="insight-user-row">
                    <span className="insight-user-avatar">{(user.name || user.username || 'U').charAt(0)}</span>
                    <div className="insight-user-info">
                      <strong>{user.name || user.username}</strong>
                      <span>{user.username}</span>
                    </div>
                    <div className="insight-user-nums">
                      <span>마스킹 <strong>{formatNumber(user.maskedCount)}</strong>건</span>
                      {user.highRiskCount > 0 && (
                        <span className="insight-high-badge">고위험 {formatNumber(user.highRiskCount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedLogs.length > 0 && (
            <div className="insight-section">
              <p className="insight-section-label">연관 로그</p>
              <div className="insight-log-list">
                {relatedLogs.map((log) => {
                  const riskKey = String(log.risk_level || 'none').toLowerCase();
                  return (
                    <div key={log.id} className="insight-log-row">
                      <time className="insight-log-time">{formatLogDate(log.timestamp)}</time>
                      <span className="insight-log-type">{formatEntityTypes(log.entity_types)}</span>
                      <div className="insight-log-right">
                        <span>{formatNumber(log.masked_count)}건</span>
                        <span className={RISK_LEVEL_CLS[riskKey] || 'risk-pill none'}>{RISK_LEVEL_LABELS[riskKey] || riskKey}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DashboardHome() {
  const {
    period,
    setPeriod,
    summary,
    maskingStats,
    categories,
    departments,
    rawSummary,
    recentLogs,
    users,
    loading,
    error,
  } = useDashboardData();

  const [selectedInsight, setSelectedInsight] = useState(null);
  const maxMaskingCount = Math.max(...maskingStats.map((item) => item.count), 1);
  const categoryColors = ['#6366f1', '#06b6d4', '#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6', '#64748b'];
  const departmentColors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#64748b'];
  const topCategories = categories.slice(0, 6);
  const categoryRest = categories.slice(6).reduce((sum, item) => sum + item.count, 0);
  const coloredCategories = [
    ...topCategories,
    ...(categoryRest > 0 ? [{ category: '기타', count: categoryRest }] : []),
  ].map((item, index) => ({
    ...item,
    color: categoryColors[index % categoryColors.length],
  }));
  const topDepartments = departments.slice(0, 6);
  const departmentRest = departments.slice(6).reduce((sum, item) => sum + item.count, 0);
  const coloredDepartments = [
    ...topDepartments,
    ...(departmentRest > 0 ? [{ department: '기타', count: departmentRest, userCount: 0 }] : []),
  ].map((item, index) => ({
    ...item,
    color: departmentColors[index % departmentColors.length],
  }));
  const categoryTotal = coloredCategories.reduce((sum, item) => sum + item.count, 0) || 1;
  const hasTopUsers = users.some((u) => u.maskedCount > 0);

  const openInsight = (type, key) => {
    setSelectedInsight((current) => (
      current?.type === type && current?.key === key
        ? null
        : { type, key, nonce: Date.now() }
    ));
  };

  const selectedDetail = useMemo(() => {
    if (!selectedInsight) return null;

    const firstPeriod = maskingStats[0];
    const selectedKey = selectedInsight.key || firstPeriod?.label;

    if (selectedInsight.type === 'summary') {
      const card = summary.find((item) => item.id === selectedInsight.key) || summary[0];
      const countMap = {
        todayMasked: rawSummary.today_masked,
        totalMasked: rawSummary.total_masked,
        monthlyMasked: rawSummary.month_masked,
        pendingRequests: rawSummary.pending_exception_requests,
      };

      let filteredLogs = recentLogs;
      let matchLog = () => true;
      let kicker = '카테고리 분석';
      let entityBreakdown;

      if (card?.id === 'todayMasked') {
        filteredLogs = recentLogs.filter((log) => isToday(log.timestamp));
        matchLog = (log) => isToday(log.timestamp);
        kicker = '오늘 탐지 카테고리';
        entityBreakdown = getEntityBreakdown(filteredLogs);
      } else if (card?.id === 'monthlyMasked') {
        filteredLogs = recentLogs.filter((log) => isThisMonth(log.timestamp));
        matchLog = (log) => isThisMonth(log.timestamp);
        kicker = '이번 달 탐지 카테고리';
        entityBreakdown = getEntityBreakdown(filteredLogs);
        if (entityBreakdown.length === 0) {
          entityBreakdown = coloredCategories.slice(0, 6).map((item) => ({ label: item.category, value: item.count }));
        }
      } else if (card?.id === 'pendingRequests') {
        kicker = '예외 요청 현황';
        entityBreakdown = [
          { label: '대기 중', value: rawSummary.pending_exception_requests || 0 },
          { label: '전체 요청', value: rawSummary.total_requests || 0 },
          { label: '고위험 탐지', value: rawSummary.high_risk_count || 0 },
        ];
      } else {
        kicker = '전체 기간 카테고리';
        entityBreakdown = coloredCategories.slice(0, 6).map((item) => ({ label: item.category, value: item.count }));
      }

      return {
        type: 'summary',
        key: card?.id,
        kicker,
        title: card?.id === 'pendingRequests'
          ? '예외 요청 및 탐지 현황'
          : (entityBreakdown.length > 0
              ? `${entityBreakdown[0].label} 등 ${entityBreakdown.length}개 카테고리 탐지`
              : `${card?.title || '요약'} 상세`),
        count: countMap[card?.id] || 0,
        breakdown: entityBreakdown,
        matchLog,
      };
    }

    if (selectedInsight.type === 'category') {
      const category = coloredCategories.find((item) => item.category === selectedInsight.key) || coloredCategories[0];
      return {
        type: 'category',
        key: category?.category,
        kicker: '카테고리 상세',
        title: `${category?.category || '카테고리'} 감지 흐름`,
        count: category?.count || 0,
        breakdown: category ? [{ label: category.category, value: category.count }] : [],
        matchLog: (log) => formatEntityTypes(log.entity_types).includes(category?.category || ''),
      };
    }

    if (selectedInsight.type === 'department') {
      const department = coloredDepartments.find((item) => item.department === selectedInsight.key) || coloredDepartments[0];
      const departmentUsers = users
        .filter((user) => (user.department || '') === (department?.department || ''))
        .sort((a, b) => b.maskedCount - a.maskedCount);
      return {
        type: 'department',
        key: department?.department,
        kicker: '부서 상세',
        title: `${department?.department || '부서'} 사용자 현황`,
        count: department?.count || 0,
        breakdown: [
          { label: '사용자', value: department?.userCount || 0 },
          { label: '대화', value: department?.conversationCount || 0 },
          { label: '메시지', value: department?.messageCount || 0 },
          { label: '마스킹 메시지', value: department?.maskedMessageCount || 0 },
          { label: '고위험', value: department?.highRiskCount || 0 },
        ],
        users: departmentUsers,
        matchLog: () => false,
      };
    }

    if (selectedInsight.type === 'user') {
      const user = users.find((u) => u.id === selectedInsight.key) || users[0];
      return {
        type: 'user',
        key: user?.id,
        kicker: '사용자 상세',
        title: `${user?.name || user?.username || '사용자'} 활동 현황`,
        count: user?.maskedCount || 0,
        breakdown: [
          { label: '대화 수', value: user?.conversationCount || 0 },
          { label: '메시지 수', value: user?.messageCount || 0 },
          { label: '마스킹 메시지', value: user?.maskedMessageCount || 0 },
          { label: '마스킹 건수', value: user?.maskedCount || 0 },
          { label: '고위험 건수', value: user?.highRiskCount || 0 },
        ],
        matchLog: () => false,
      };
    }

    const periodItem = maskingStats.find((item) => item.label === selectedKey) || firstPeriod;
    return {
      type: 'period',
      key: periodItem?.label,
      kicker: getPeriodLabel(period),
      title: `${periodItem?.label || '기간'} 마스킹 상세`,
      count: periodItem?.count || 0,
      breakdown: maskingStats.map((item) => ({ label: item.label, value: item.count })),
      matchLog: (log) => logMatchesPeriod(log, period, periodItem?.label),
    };
  }, [coloredCategories, coloredDepartments, maskingStats, period, rawSummary, recentLogs, selectedInsight, summary, users]);

  return (
    <DashboardLayout title="대시보드">
      {loading && <div className="dashboard-state">대시보드 데이터를 불러오는 중입니다.</div>}
      {error && <div className="dashboard-state error">{error}</div>}

      <section className="stat-grid">
        {summary.map((item) => (
          <StatCard
            accentText={item.accentText}
            icon={item.icon}
            isActive={selectedDetail?.type === 'summary' && selectedDetail.key === item.id}
            key={item.id}
            onClick={() => openInsight('summary', item.id)}
            title={item.title}
            value={item.value}
          />
        ))}
      </section>

      {selectedDetail?.type === 'summary' && (
        <DetailPanel
          key={`${selectedDetail.type}-${selectedDetail.key}-${selectedInsight?.nonce || 0}`}
          insight={selectedDetail}
          recentLogs={recentLogs}
          totalMasked={rawSummary.total_masked || 0}
          onClose={() => setSelectedInsight(null)}
        />
      )}

      <section className="dashboard-card">
        <div className="dashboard-card-header dashboard-card-header-row">
          <div>
            <h2>마스킹 통계</h2>
          </div>
          <PeriodFilter
            period={period}
            onChangePeriod={(nextPeriod) => {
              setPeriod(nextPeriod);
              setSelectedInsight(null);
            }}
          />
        </div>

        <TrendLine
          data={maskingStats}
          selectedLabel={selectedDetail?.type === 'period' ? selectedDetail.key : ''}
          onSelectPoint={(label) => openInsight('period', label)}
        />

        <RiskDistributionBar logs={recentLogs} />

        <div className="masking-chart">
          {maskingStats.map((item) => (
            <button
              className={`bar-row ${selectedDetail?.type === 'period' && selectedDetail.key === item.label ? 'active' : ''}`}
              key={item.label}
              onClick={() => openInsight('period', item.label)}
              type="button"
            >
              <span className="bar-label">{item.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.count / maxMaskingCount) * 100}%` }}
                />
              </div>
              <span className="bar-value">{formatNumber(item.count)}건</span>
            </button>
          ))}
        </div>
      </section>

      {selectedDetail?.type === 'period' && (
        <DetailPanel
          key={`${selectedDetail.type}-${selectedDetail.key}-${selectedInsight?.nonce || 0}`}
          insight={selectedDetail}
          recentLogs={recentLogs}
          totalMasked={rawSummary.total_masked || 0}
          onClose={() => setSelectedInsight(null)}
        />
      )}

      {(hasTopUsers || selectedDetail?.type === 'user') && (
        <section className="dashboard-grid single">
          {selectedDetail?.type === 'user' ? (
            <DetailPanel
              key={`${selectedDetail.type}-${selectedDetail.key}-${selectedInsight?.nonce || 0}`}
              insight={selectedDetail}
              recentLogs={recentLogs}
              totalMasked={rawSummary.total_masked || 0}
              onClose={() => setSelectedInsight(null)}
            />
          ) : (
            <TopUsersCard
              users={users}
              onSelectUser={(user) => openInsight('user', user.id)}
            />
          )}
        </section>
      )}

      <section className="dashboard-grid">
        <CategoryStatsCard
          categories={coloredCategories.map((item) => ({
            ...item,
            share: Math.round((item.count / categoryTotal) * 100),
          }))}
          selectedCategory={selectedDetail?.type === 'category' ? selectedDetail.key : ''}
          onSelectCategory={(item) => openInsight('category', item.category)}
        />

        <DepartmentStatsCard
          departments={coloredDepartments}
          selectedDepartment={selectedDetail?.type === 'department' ? selectedDetail.key : ''}
          onSelectDepartment={(item) => openInsight('department', item.department)}
        />
      </section>

      {(selectedDetail?.type === 'category' || selectedDetail?.type === 'department') && (
        <section className="dashboard-grid single">
          <DetailPanel
            key={`${selectedDetail.type}-${selectedDetail.key}-${selectedInsight?.nonce || 0}`}
            insight={selectedDetail}
            recentLogs={recentLogs}
            totalMasked={rawSummary.total_masked || 0}
            onClose={() => setSelectedInsight(null)}
          />
        </section>
      )}
    </DashboardLayout>
  );
}

export default DashboardHome;
