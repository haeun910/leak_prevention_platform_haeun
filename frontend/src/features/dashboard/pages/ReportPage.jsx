import { useEffect, useRef, useState } from 'react';
import { FileDown, Loader, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import {
  getAdminStats,
  getDashboardOverview,
  getDepartmentStats,
  getExceptionKeywords,
  getExceptionRequests,
} from '../services/dashboardApi';
import '../dashboard.css';
import './ReportPage.css';

const PERIOD_OPTIONS = [
  { label: '이번 달', value: 'this_month' },
  { label: '지난 달', value: 'last_month' },
  { label: '최근 3개월', value: 'last_3_months' },
];

const ENTITY_COLORS = {
  '주민등록번호': '#ef4444',
  '카드번호': '#ef4444',
  '계좌번호': '#ef4444',
  '비밀번호': '#ef4444',
  'API키': '#ef4444',
  '전화번호': '#f59e0b',
  '이메일': '#f59e0b',
  '차량번호': '#f59e0b',
  '주소': '#f59e0b',
  '이름': '#6366f1',
  '기관명': '#6366f1',
  '문서명': '#6366f1',
  '프로젝트': '#6366f1',
};

function ReportPage() {
  const [period, setPeriod] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const reportRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, statsRes, deptRes, exceptionsRes, keywordsRes] = await Promise.all([
        getDashboardOverview(),
        getAdminStats(),
        getDepartmentStats(),
        getExceptionRequests(),
        getExceptionKeywords(),
      ]);
      setData({
        overview: overviewRes.data,
        stats: statsRes.data,
        departments: deptRes.data,
        exceptions: exceptionsRes.data,
        keywords: keywordsRes.data,
      });
    } catch {
      setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    const now = new Date();
    if (period === 'this_month') {
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    }
    if (period === 'last_month') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    }
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ~ ${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  };

  const getMonthKey = (offset = 0) => {
    const d = new Date();
    d.setDate(1); // 월말(29~31일)에서 setMonth 시 날짜 오버플로우 방지
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthlyComparison = () => {
    if (!data) return { current: 0, previous: 0 };
    const months = data.overview?.masking_stats?.month || [];
    const byLabel = Object.fromEntries(months.map((m) => [m.label, m.count]));

    if (period === 'this_month') {
      return { current: byLabel[getMonthKey(0)] || 0, previous: byLabel[getMonthKey(-1)] || 0 };
    }
    if (period === 'last_month') {
      return { current: byLabel[getMonthKey(-1)] || 0, previous: byLabel[getMonthKey(-2)] || 0 };
    }
    const current = [0, -1, -2].reduce((s, i) => s + (byLabel[getMonthKey(i)] || 0), 0);
    const previous = [-3, -4, -5].reduce((s, i) => s + (byLabel[getMonthKey(i)] || 0), 0);
    return { current, previous };
  };

  const getChangeRate = (current, previous) => {
    if (!previous) return null;
    const rate = (((current - previous) / previous) * 100).toFixed(1);
    return Number(rate) >= 0 ? `+${rate}%` : `${rate}%`;
  };

  const getExceptionSummary = () => {
    if (!data) return { approved: 0, rejected: 0, pending: 0 };
    return {
      approved: data.exceptions.filter((e) => e.status === 'approved').length,
      rejected: data.exceptions.filter((e) => e.status === 'rejected').length,
      pending: data.exceptions.filter((e) => e.status === 'pending').length,
    };
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      let remaining = imgH;
      let yPos = 0;

      pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH);
      remaining -= pageH;

      while (remaining > 0) {
        yPos -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yPos, pageW, imgH);
        remaining -= pageH;
      }

      const now = new Date();
      const fileName = `veil-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      pdf.save(fileName);
    } catch {
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const { current, previous } = getMonthlyComparison();
  const changeRate = getChangeRate(current, previous);
  const exceptionSummary = getExceptionSummary();
  const categories = data?.overview?.categories || [];
  const maxCategoryCount = Math.max(...categories.map((c) => c.count), 1);
  const categoryTotal = categories.reduce((s, c) => s + c.count, 0);
  const departments = (data?.departments || []).slice(0, 6);
  const maxDeptCount = Math.max(...departments.map((d) => d.masked_count), 1);
  const activeKeywords = (data?.keywords || []).filter((k) => k.enabled).length;
  const totalUsers = (data?.departments || []).reduce((s, d) => s + d.user_count, 0);
  const generatedAt = new Date().toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <DashboardLayout
      title="보안 보고서"
      description="기간별 마스킹 현황과 보안 통계를 PDF로 내보냅니다."
    >
      {error && <div className="dashboard-state error">{error}</div>}

      {/* 컨트롤 영역 */}
      <div className="report-controls">
        <div className="report-period-group">
          <span className="report-period-label">보고 기간</span>
          <div className="report-period-tabs">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`report-period-tab ${period === opt.value ? 'active' : ''}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="report-download-btn"
          onClick={handleDownload}
          disabled={generating || loading || !!error}
        >
          {generating ? (
            <><Loader size={15} className="report-spin" /> 생성 중...</>
          ) : (
            <><FileDown size={15} /> PDF 다운로드</>
          )}
        </button>
      </div>

      {/* 보고서 본문 — html2canvas 캡처 대상 */}
      {loading ? (
        <div className="dashboard-state">데이터를 불러오는 중...</div>
      ) : (
        <div className="report-preview" ref={reportRef}>

          {/* ── 헤더 ── */}
          <div className="rp-header">
            <div className="rp-header-left">
              <div className="rp-logo">
                <ShieldCheck size={20} strokeWidth={2.4} />
              </div>
              <div>
                <div className="rp-title">Veil AI 보안 보고서</div>
                <div className="rp-subtitle">{getPeriodLabel()}</div>
              </div>
            </div>
            <div className="rp-meta">
              <div>생성일시: {generatedAt}</div>
              <div>생성자: 관리자</div>
            </div>
          </div>

          {/* ── 섹션 1: 전체 현황 요약 ── */}
          <div className="rp-section">
            <div className="rp-section-title">전체 현황 요약</div>
            <div className="rp-stat-grid">
              <div className="rp-stat-card">
                <div className="rp-stat-value">{(data?.stats?.total_requests || 0).toLocaleString()}</div>
                <div className="rp-stat-label">총 AI 사용 요청</div>
              </div>
              <div className="rp-stat-card">
                <div className="rp-stat-value rp-indigo">{(data?.stats?.masked_requests || 0).toLocaleString()}</div>
                <div className="rp-stat-label">마스킹 처리 건수</div>
              </div>
              <div className="rp-stat-card">
                <div className="rp-stat-value rp-red">{(data?.stats?.high_risk_count || 0).toLocaleString()}</div>
                <div className="rp-stat-label">고위험 차단</div>
              </div>
              <div className="rp-stat-card">
                <div className="rp-stat-value rp-green">{totalUsers.toLocaleString()}</div>
                <div className="rp-stat-label">활성 사용자</div>
              </div>
            </div>
          </div>

          {/* ── 섹션 2+3: 유형별 / 부서별 ── */}
          <div className="rp-two-col">

            {/* 민감정보 유형별 통계 */}
            <div className="rp-section rp-card">
              <div className="rp-section-title">민감정보 유형별 통계</div>
              {categories.length === 0 ? (
                <div className="rp-empty">탐지된 데이터가 없습니다.</div>
              ) : (
                <div className="rp-bar-list">
                  {categories.map((cat) => {
                    const pct = Math.round((cat.count / maxCategoryCount) * 100);
                    const ratio = categoryTotal ? Math.round((cat.count / categoryTotal) * 100) : 0;
                    const color = ENTITY_COLORS[cat.category] || '#6366f1';
                    return (
                      <div key={cat.category} className="rp-bar-row">
                        <div className="rp-bar-name">{cat.category}</div>
                        <div className="rp-bar-track">
                          <div className="rp-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="rp-bar-stat">{cat.count.toLocaleString()}건 <span className="rp-ratio">{ratio}%</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 부서별 현황 */}
            <div className="rp-section rp-card">
              <div className="rp-section-title">부서별 현황</div>
              {departments.length === 0 ? (
                <div className="rp-empty">부서 데이터가 없습니다.</div>
              ) : (
                <div className="rp-bar-list">
                  {departments.map((dept) => {
                    const pct = Math.round((dept.masked_count / maxDeptCount) * 100);
                    return (
                      <div key={dept.department} className="rp-bar-row">
                        <div className="rp-bar-name">{dept.department}</div>
                        <div className="rp-bar-track">
                          <div className="rp-bar-fill" style={{ width: `${pct}%`, background: '#6366f1' }} />
                        </div>
                        <div className="rp-bar-stat">{dept.masked_count.toLocaleString()}건</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 섹션 4+5: 예외 처리 / 전월 대비 ── */}
          <div className="rp-two-col">

            {/* 예외 처리 현황 */}
            <div className="rp-section rp-card">
              <div className="rp-section-title">예외 처리 현황</div>
              <div className="rp-exception-grid">
                <div className="rp-exception-item rp-approved">
                  <div className="rp-exception-count">{exceptionSummary.approved}</div>
                  <div className="rp-exception-label">승인</div>
                </div>
                <div className="rp-exception-item rp-rejected">
                  <div className="rp-exception-count">{exceptionSummary.rejected}</div>
                  <div className="rp-exception-label">거절</div>
                </div>
                <div className="rp-exception-item rp-pending">
                  <div className="rp-exception-count">{exceptionSummary.pending}</div>
                  <div className="rp-exception-label">대기</div>
                </div>
              </div>
              <div className="rp-keyword-count">
                활성 예외 키워드: <strong>{activeKeywords}개</strong>
              </div>
            </div>

            {/* 전월 대비 */}
            <div className="rp-section rp-card">
              <div className="rp-section-title">전월 대비</div>
              <div className="rp-compare-row">
                <div className="rp-compare-label">마스킹 처리 건수</div>
                <div className="rp-compare-values">
                  <span className="rp-compare-current">{current.toLocaleString()}건</span>
                  {changeRate && (
                    <span className={`rp-change-badge ${parseFloat(changeRate) >= 0 ? 'up' : 'down'}`}>
                      {parseFloat(changeRate) >= 0
                        ? <TrendingUp size={12} />
                        : <TrendingDown size={12} />}
                      {changeRate}
                    </span>
                  )}
                </div>
                <div className="rp-compare-prev">전월: {previous.toLocaleString()}건</div>
              </div>
              {!changeRate && (
                <div className="rp-empty">전월 데이터가 충분하지 않습니다.</div>
              )}
            </div>
          </div>

          {/* ── 푸터 ── */}
          <div className="rp-footer">
            본 보고서는 Veil AI 시스템에서 자동 생성되었습니다. · {generatedAt}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ReportPage;
