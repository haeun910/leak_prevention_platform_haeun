import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarCheck, ClipboardList, ShieldCheck } from 'lucide-react';
import { getDashboardOverview, getDepartmentStats } from '../services/dashboardApi';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function useDashboardData() {
  const [period, setPeriod] = useState('day');
  const [overview, setOverview] = useState(null);
  const [departmentRows, setDepartmentRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [overviewRes, deptRes] = await Promise.all([
          getDashboardOverview(),
          getDepartmentStats(),
        ]);
        if (!mounted) return;
        setOverview(overviewRes.data);
        setDepartmentRows(deptRes.data);
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
        description: '오늘 감지 및 마스킹된 항목 수',
        accentText: '일간',
        icon: CalendarCheck,
      },
      {
        id: 'totalMasked',
        title: '전체 마스킹 건수',
        value: formatNumber(data.total_masked),
        description: `${formatNumber(data.total_requests)}건의 요청에서 집계`,
        accentText: '누적',
        icon: ShieldCheck,
      },
      {
        id: 'monthlyMasked',
        title: '이번 달 마스킹 건수',
        value: formatNumber(data.month_masked),
        description: '이번 달 발생한 마스킹 처리 수',
        accentText: '월간',
        icon: BarChart3,
      },
      {
        id: 'pendingRequests',
        title: '대기 중 예외 요청',
        value: formatNumber(data.pending_exception_requests),
        description: '관리자 검토가 필요한 요청',
        accentText: '확인 필요',
        icon: ClipboardList,
      },
    ];
  }, [overview]);

  const maskingStats = overview?.masking_stats?.[period]?.length
    ? overview.masking_stats[period]
    : [{ label: '데이터 없음', count: 0 }];

  const categories = overview?.categories?.length
    ? overview.categories
    : [{ category: '데이터 없음', count: 0 }];

  const departments = departmentRows.length
    ? departmentRows.map((item) => ({
        department: item.department,
        count: item.masked_count,
      }))
    : [{ department: '데이터 없음', count: 0 }];

  const recentRequests = (overview?.recent_logs || []).map((log) => ({
    id: log.id,
    keyword: log.entity_types,
    requester: log.session_id || '-',
    department: log.risk_level,
    reason: `${formatNumber(log.masked_count)}개 항목 마스킹`,
    status: log.risk_level,
  }));

  return {
    period,
    setPeriod,
    summary,
    maskingStats,
    categories,
    departments,
    recentRequests,
    loading,
    error,
  };
}

export default useDashboardData;
