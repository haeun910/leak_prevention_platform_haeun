import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, ClipboardList, ShieldCheck } from 'lucide-react';
import { getDashboardOverview, getDepartmentStats, getUserStats } from '../services/dashboardApi';
import { formatEntityTypes, isDeprecatedEntityType, labelEntityType } from '../../../utils/entityLabels';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function useDashboardData() {
  const [period, setPeriod] = useState('day');
  const [overview, setOverview] = useState(null);
  const [departmentRows, setDepartmentRows] = useState([]);
  const [userRows, setUserRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [overviewRes, deptRes, userRes] = await Promise.all([
          getDashboardOverview(),
          getDepartmentStats(),
          getUserStats(),
        ]);
        if (!mounted) return;
        setOverview(overviewRes.data);
        setDepartmentRows(deptRes.data);
        setUserRows(userRes.data);
      } catch (err) {
        if (mounted) setError(err.response?.data?.detail || '대시보드 데이터를 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const data = overview?.summary || {};
    return [
      {
        id: 'todayMasked',
        title: '오늘 마스킹 건수',
        value: formatNumber(data.today_masked),
        accentText: '일간',
        icon: CalendarCheck,
      },
      {
        id: 'totalMasked',
        title: '전체 마스킹 건수',
        value: formatNumber(data.total_masked),
        accentText: '누적',
        icon: ShieldCheck,
      },
      {
        id: 'monthlyMasked',
        title: '이번 달 마스킹 건수',
        value: formatNumber(data.month_masked),
        accentText: '월간',
        icon: BarChart3,
      },
      {
        id: 'pendingRequests',
        title: '대기 중 예외 요청',
        value: formatNumber(data.pending_exception_requests),
        accentText: '확인 필요',
        icon: ClipboardList,
      },
    ];
  }, [overview]);

  const maskingStats = overview?.masking_stats?.[period]?.length
    ? overview.masking_stats[period].map((item) => ({ ...item, count: Number(item.count || 0) }))
    : [{ label: '데이터 없음', count: 0 }];

  const categories = overview?.categories?.length
    ? Object.values(
        overview.categories.reduce((acc, item) => {
          if (isDeprecatedEntityType(item.category)) return acc;
          const category = labelEntityType(item.category);
          if (!category) return acc;
          acc[category] = acc[category] || { category, count: 0 };
          acc[category].count += Number(item.count || 0);
          return acc;
        }, {})
      )
    : [];

  const departments = departmentRows.length
    ? departmentRows.map((item) => ({
        department: item.department,
        count: Number(item.masked_count || 0),
        userCount: Number(item.user_count || 0),
        conversationCount: Number(item.conversation_count || 0),
        messageCount: Number(item.message_count || 0),
        maskedMessageCount: Number(item.masked_message_count || 0),
        highRiskCount: Number(item.high_risk_count || 0),
      }))
    : [{ department: '데이터 없음', count: 0 }];

  const recentRequests = (overview?.recent_logs || [])
    .map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      keyword: formatEntityTypes(log.entity_types),
      riskLevel: log.risk_level || 'none',
      maskedCount: Number(log.masked_count || 0),
    }))
    .filter((log) => log.keyword !== '-');

  const rawSummary = overview?.summary || {};
  const recentLogs = (overview?.recent_logs || []).filter((log) => formatEntityTypes(log.entity_types) !== '-');
  const users = userRows.map((item) => ({
    id: item.user_id,
    username: item.username,
    name: item.name,
    department: item.department,
    role: item.role,
    conversationCount: Number(item.conversation_count || 0),
    messageCount: Number(item.message_count || 0),
    maskedMessageCount: Number(item.masked_message_count || 0),
    maskedCount: Number(item.masked_count || 0),
    highRiskCount: Number(item.high_risk_count || 0),
  }));

  return {
    period,
    setPeriod,
    summary,
    maskingStats,
    categories: categories.length ? categories : [{ category: '데이터 없음', count: 0 }],
    departments,
    recentRequests,
    rawSummary,
    recentLogs,
    users,
    loading,
    error,
  };
}

export default useDashboardData;
