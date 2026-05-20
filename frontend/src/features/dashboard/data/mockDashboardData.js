import {
  ShieldCheck,
  CalendarCheck,
  BarChart3,
  ClipboardList
} from 'lucide-react';

// 대시보드 임시 데이터 파일
// 역할:
// 1) 백엔드 연결 전까지 대시보드 화면에 보여줄 테스트 데이터를 관리
// 2) 실제 서비스에서는 FastAPI 백엔드에서 받아올 데이터 구조를 미리 흉내냄
// 3) 화면 컴포넌트 안에 데이터를 직접 작성하지 않기 위해 분리
// 4) 나중에 백엔드 연결 시 dashboardApi.js 내부만 수정하면 되도록 구성

// 상단 요약 통계 카드 데이터
export const dashboardSummary = [
  {
    id: 'todayMasked',
    title: '오늘 마스킹 건수',
    value: '46',
    description: '오늘 탐지 및 마스킹된 항목 수',
    accentText: '일간',
    icon: CalendarCheck
  },
  {
    id: 'totalMasked',
    title: '전체 마스킹 건수',
    value: '1,280',
    description: '누적 민감정보 마스킹 수',
    accentText: '+12%',
    icon: ShieldCheck
  },
  {
    id: 'monthlyMasked',
    title: '이번 달 마스킹 건수',
    value: '842',
    description: '이번 달 발생한 마스킹 처리 수',
    accentText: '월간',
    icon: BarChart3
  },
  {
    id: 'pendingRequests',
    title: '대기 중 예외 요청',
    value: '7',
    description: '관리자 검토가 필요한 요청',
    accentText: '확인 필요',
    icon: ClipboardList
  }
];

// 일간 / 월간 / 연간 통계 데이터
// PeriodFilter에서 선택한 값에 따라 이 데이터가 바뀜
export const maskingStatsByPeriod = {
  day: [
    { label: '월', count: 120 },
    { label: '화', count: 160 },
    { label: '수', count: 98 },
    { label: '목', count: 210 },
    { label: '금', count: 180 },
    { label: '토', count: 75 },
    { label: '일', count: 52 }
  ],

  month: [
    { label: '1월', count: 420 },
    { label: '2월', count: 510 },
    { label: '3월', count: 690 },
    { label: '4월', count: 842 },
    { label: '5월', count: 760 },
    { label: '6월', count: 930 }
  ],

  year: [
    { label: '2022', count: 3280 },
    { label: '2023', count: 4960 },
    { label: '2024', count: 6840 },
    { label: '2025', count: 8120 },
    { label: '2026', count: 9280 }
  ]
};

// 마스킹 카테고리별 누적 통계
export const categoryStats = [
  { category: '이메일', count: 320 },
  { category: '전화번호', count: 260 },
  { category: '주민등록번호', count: 180 },
  { category: '계좌번호', count: 92 },
  { category: '주소', count: 74 },
  { category: '사원번호', count: 58 }
];

// 부서별 마스킹 통계
export const departmentStats = [
  { department: '개발팀', count: 410 },
  { department: '인사팀', count: 280 },
  { department: '영업팀', count: 230 },
  { department: '기획팀', count: 160 },
  { department: '재무팀', count: 120 }
];

// 최근 사용자 피드백 / 예외 요청 목록
export const recentExceptionRequests = [
  {
    id: 1,
    keyword: 'KoELECTRA',
    requester: '김OO',
    department: '개발팀',
    reason: '모델명이라 마스킹되면 안 됩니다.',
    status: '대기중'
  },
  {
    id: 2,
    keyword: '마스킹플랫폼',
    requester: '박OO',
    department: '기획팀',
    reason: '서비스명으로 자주 사용됩니다.',
    status: '대기중'
  },
  {
    id: 3,
    keyword: 'GPT API',
    requester: '이OO',
    department: '개발팀',
    reason: '업무상 사용되는 기술명입니다.',
    status: '승인'
  },
  {
    id: 4,
    keyword: '사내보안봇',
    requester: '최OO',
    department: '보안팀',
    reason: '내부 프로젝트명입니다.',
    status: '거절'
  }
];