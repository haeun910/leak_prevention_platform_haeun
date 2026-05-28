import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Edit2, Plus, Trash2, X } from 'lucide-react';
import './TemplatePanel.css';

// ─────────────────────────────────────────────────────────────
// 시스템 기본 제공 템플릿 (서버 없이 프론트엔드에 고정 내장)
// isSystem: true → 수정/삭제 버튼 표시 안 함
// ─────────────────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    id: 'sys-1',
    title: '업무 이메일 초안',
    content: `당신은 비즈니스 커뮤니케이션 전문가입니다. 아래 정보를 바탕으로 전문적인 업무 이메일을 작성해 주세요.

[수신자 정보]
- 수신자 이름/직함:
- 소속(회사/부서):
- 관계: (예: 협력사 담당자 / 고객사 팀장 / 내부 타 부서)

[이메일 목적]
- 핵심 목적: (예: 미팅 일정 조율 / 프로젝트 결과 보고 / 협조 요청)
- 주요 전달 내용:

[작성 조건]
- 톤앤매너: (예: 격식체·정중하게 / 친근한 비즈니스 어체)
- 마감 기한 언급 여부: (있으면 날짜 기재)
- 첨부 파일 여부:

결과물: 제목(Subject)과 본문을 구분하여 완성된 이메일 형식으로 작성해 주세요.`,
    category: '커뮤니케이션',
    isSystem: true,
  },
  {
    id: 'sys-2',
    title: '회의록 정리 및 요약',
    content: `아래 회의 내용을 구조화된 회의록 형식으로 정리해 주세요.

[회의 기본 정보]
- 회의명:
- 일시:
- 참석자:
- 작성자:

[회의 내용 (아래에 붙여넣기)]


---
위 내용을 다음 형식으로 정리해 주세요:

1. 회의 목적 (1~2줄 요약)
2. 주요 논의 사항 (항목별 bullet)
3. 결정 사항 (명확하게 확정된 것만)
4. 액션 아이템 (담당자 | 내용 | 기한 형식으로)
5. 다음 회의 일정 및 안건 (있는 경우)`,
    category: '회의',
    isSystem: true,
  },
  {
    id: 'sys-3',
    title: '코드 리뷰 요청',
    content: `당신은 시니어 소프트웨어 엔지니어입니다. 아래 코드를 리뷰하고 개선점을 구체적으로 제안해 주세요.

[코드 정보]
- 언어/프레임워크:
- 기능 설명:

[리뷰 코드]
\`\`\`

\`\`\`

[리뷰 시 중점 확인 사항]
- 버그 및 잠재적 오류 (엣지 케이스 포함)
- 보안 취약점 (SQL 인젝션, XSS, 인증 누락 등)
- 성능 문제 (불필요한 반복, N+1 쿼리 등)
- 코드 가독성 및 유지보수성
- 네이밍 컨벤션 및 코드 구조

각 항목별로 문제점과 구체적인 개선 코드를 함께 제시해 주세요.`,
    category: '개발',
    isSystem: true,
  },
  {
    id: 'sys-4',
    title: 'SQL 쿼리 작성',
    content: `당신은 데이터베이스 전문가입니다. 아래 요구사항에 맞는 SQL 쿼리를 작성해 주세요.

[환경 정보]
- DB 종류: (예: MySQL 8.0 / PostgreSQL 15 / MSSQL)
- 관련 테이블 구조:
  \`\`\`
  테이블명:
  컬럼: (컬럼명 | 타입 | 설명)
  \`\`\`

[요구사항]
- 원하는 결과:
- 조건/필터:
- 정렬 기준:
- 성능 고려사항: (예: 인덱스 활용, 대용량 테이블)

쿼리 작성 후 실행 결과 예시와 성능 최적화 포인트도 함께 설명해 주세요.`,
    category: '개발',
    isSystem: true,
  },
  {
    id: 'sys-5',
    title: '데이터 분석 및 인사이트 도출',
    content: `당신은 데이터 분석 전문가입니다. 아래 데이터를 분석하고 비즈니스 인사이트를 도출해 주세요.

[분석 배경]
- 분석 목적: (예: 월간 매출 트렌드 파악 / 이탈 고객 원인 분석)
- 데이터 기간:
- 대상 지표:

[데이터 (아래에 붙여넣기 또는 설명)]


---
다음 관점에서 분석해 주세요:

1. 주요 수치 요약 (핵심 KPI 현황)
2. 트렌드 분석 (증감 패턴, 이상치)
3. 원인 가설 (데이터 기반 추정)
4. 비즈니스 시사점 (실질적 의미)
5. 권고 액션 (우선순위 포함)`,
    category: '데이터 분석',
    isSystem: true,
  },
  {
    id: 'sys-6',
    title: '경영진 보고서 작성',
    content: `당신은 전략 컨설턴트입니다. 아래 정보를 바탕으로 경영진 보고서를 작성해 주세요.

[보고서 기본 정보]
- 보고 주제:
- 보고 대상: (예: CEO / 이사회 / 부서장)
- 보고 목적: (예: 현황 공유 / 의사결정 요청 / 승인 요청)

[핵심 내용]
- 현황 및 배경:
- 문제점 또는 기회:
- 검토한 대안:
- 권고안:
- 예상 효과/리스크:
- 필요 의사결정 사항:

[작성 형식]
Executive Summary (3줄 이내) → 현황 분석 → 문제/기회 정의 → 대안 비교 → 권고안 및 실행계획 → 기대효과 순으로 작성해 주세요. 각 섹션은 bullet point 위주로 간결하게 작성해 주세요.`,
    category: '문서',
    isSystem: true,
  },
  {
    id: 'sys-7',
    title: '영문 → 한국어 번역',
    content: `당신은 전문 번역가입니다. 아래 영문 문서를 한국어로 번역해 주세요.

[번역 조건]
- 문서 유형: (예: 기술 문서 / 계약서 / 마케팅 자료 / 뉴스 기사)
- 대상 독자: (예: 개발자 / 일반 임직원 / 고객)
- 번역 스타일: (예: 격식체 / 구어체 / 원문에 충실하게)
- 전문 용어 처리: (예: 한국어로 변환 / 영문 병기 / 음차 표기)

[번역할 원문]


---
번역 시 유의사항:
- 자연스러운 한국어 표현 사용 (직역 지양)
- 전문 용어는 업계 표준 한국어 사용
- 원문의 뉘앙스와 강조점 유지
- 불명확한 표현은 각주로 원문 병기`,
    category: '번역',
    isSystem: true,
  },
  {
    id: 'sys-8',
    title: '직원 성과 평가서 작성',
    content: `당신은 HR 전문가입니다. 아래 정보를 바탕으로 공정하고 구체적인 직원 성과 평가서를 작성해 주세요.

[평가 대상자 정보]
- 이름/직급:
- 부서/직무:
- 평가 기간:
- 평가자:

[성과 내용]
- 주요 달성 업무 및 성과:
- 목표 대비 달성률:
- 팀 기여도 및 협업:
- 역량 개발 노력:
- 개선이 필요한 부분:

[평가서 작성 요청 사항]
1. 강점 (구체적 사례와 수치 포함)
2. 개선 필요 영역 (건설적이고 구체적으로)
3. 종합 평가 의견 (200자 내외)
4. 다음 기간 발전 방향 제언
※ 주관적 판단보다 사실 기반으로, 부정적 표현은 성장 지향적으로 작성해 주세요.`,
    category: 'HR',
    isSystem: true,
  },
  {
    id: 'sys-9',
    title: '기획안 아이디어 도출',
    content: `당신은 창의적 전략 기획 전문가입니다. 아래 주제에 대해 실행 가능한 아이디어를 도출해 주세요.

[기획 배경]
- 주제/문제:
- 목표 고객/대상:
- 핵심 목표: (예: 신규 고객 유치 / 비용 절감 / 직원 만족도 향상)
- 예산 규모: (예: 제한 없음 / 소규모 / 대규모)
- 기간:

[제약 조건]
- 반드시 포함해야 할 요소:
- 피해야 할 요소:

아이디어를 다음 형식으로 제안해 주세요:
1. 아이디어명 (임팩트 있는 한 줄 제목)
   - 핵심 내용:
   - 차별점:
   - 예상 효과:
   - 실행 난이도: (상/중/하)
최소 5개 이상, 다양한 관점(보수적~혁신적)을 포함해 주세요.`,
    category: '기획',
    isSystem: true,
  },
  {
    id: 'sys-10',
    title: '사내 공지사항 작성',
    content: `당신은 사내 커뮤니케이션 담당자입니다. 아래 내용을 바탕으로 임직원이 이해하기 쉬운 공지사항을 작성해 주세요.

[공지 기본 정보]
- 공지 제목(초안):
- 공지 유형: (예: 정책 변경 / 행사 안내 / 시스템 점검 / 인사 발령)
- 수신 대상: (예: 전 임직원 / 특정 부서 / 관리자 이상)
- 시행/적용 일자:

[공지 핵심 내용]
- 변경/안내 사항 요약:
- 변경 이유 또는 배경:
- 임직원에게 요청하는 사항:
- 예외 처리 또는 유의사항:
- 문의처:

[작성 원칙]
- 첫 문단에 핵심 내용 먼저 (두berliner 원칙)
- 번호/bullet로 구체적 행동 지침 명시
- 전문 용어는 쉬운 표현으로 풀어쓰기
- 공지 제목은 내용을 한눈에 알 수 있게 작성`,
    category: '커뮤니케이션',
    isSystem: true,
  },
  {
    id: 'sys-11',
    title: '제안서/기획서 목차 구성',
    content: `당신은 비즈니스 전략 전문가입니다. 아래 프로젝트의 제안서 또는 기획서 목차와 각 섹션별 핵심 작성 내용을 구성해 주세요.

[프로젝트 개요]
- 제안/기획 명칭:
- 목적:
- 주요 독자(의사결정자):
- 문서 유형: (예: 신규 사업 제안서 / 예산 기획서 / IT 시스템 도입 제안)
- 예상 분량: (예: A4 5페이지 / 10페이지)

[포함되어야 할 핵심 메시지]
- 이 문서를 통해 얻고자 하는 것:
- 강조하고 싶은 차별점:

다음을 제공해 주세요:
1. 추천 목차 (섹션별 소제목)
2. 각 섹션에 들어갈 핵심 내용 요약 (2~3줄)
3. 설득력을 높이기 위한 작성 팁`,
    category: '문서',
    isSystem: true,
  },
  {
    id: 'sys-12',
    title: '고객 응대 답변 작성',
    content: `당신은 고객 성공 전문가입니다. 아래 고객 문의/불만에 대한 전문적인 답변을 작성해 주세요.

[고객 문의 내용]
- 문의 유형: (예: 불만 제기 / 기능 문의 / 환불 요청 / 오류 신고)
- 고객 메시지:


[답변 작성 조건]
- 응대 채널: (예: 이메일 / 채팅 / 전화 후 후속 이메일)
- 처리 가능 여부: (예: 즉시 해결 가능 / 확인 후 답변 필요 / 정책상 불가)
- 보상 또는 대안 제공 여부:
- 브랜드 톤: (예: 친근하고 따뜻하게 / 격식 있고 전문적으로)

답변에 포함할 요소:
1. 공감 표현 (고객 감정 인정)
2. 문제 상황 명확히 인지했음을 확인
3. 해결 방안 또는 다음 단계 안내
4. 재발 방지 또는 서비스 개선 의지 표현
5. 마무리 인사`,
    category: '커뮤니케이션',
    isSystem: true,
  },
];

// ─────────────────────────────────────────────────────────────
// TemplateFormModal: 새 템플릿 추가 / 기존 템플릿 수정 / 시스템 템플릿 복사 모달
//
// mode 별 동작:
//   'create'      - 새 템플릿 생성
//   'edit'        - 기존 사용자 템플릿 수정 (id 포함)
//   'copy-system' - 시스템 템플릿을 내 템플릿으로 복사
//
// [설계 의도]
// - onSave 는 async 함수 → 실패 시 모달 유지, 에러 메시지 표시
// - 저장 중 모든 입력 비활성화로 중복 요청 방지
// ─────────────────────────────────────────────────────────────
function TemplateFormModal({ template, mode, onSave, onClose }) {
  const [title, setTitle] = useState(template?.title || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState(template?.category || '기타');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      // onSave가 throw 하면 catch로 내려가고 모달은 열린 상태 유지
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || '기타',
      });
      // onSave 성공 → 부모 handleFormSave가 setFormOpen(false) 호출하므로 여기서는 아무것도 안 함
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    // 오버레이 클릭 시 닫힘 (저장 중엔 닫기 막기)
    <div
      className="tp-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="tp-modal">
        <div className="tp-modal-header">
          <span>
            {mode === 'copy-system' ? '내 템플릿으로 복사' : mode === 'edit' ? '템플릿 수정' : '새 템플릿 추가'}
          </span>
          <button type="button" className="tp-modal-close" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tp-modal-form">
          {mode === 'copy-system' && (
            <div className="tp-modal-notice">
              시스템 템플릿은 원본을 수정할 수 없습니다. 내용을 변경하면 <strong>내 템플릿으로 새로 저장</strong>됩니다.
            </div>
          )}
          <label className="tp-modal-label">
            제목
            <input
              className="tp-modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 이메일 초안 작성"
              maxLength={50}
              required
              autoFocus
              disabled={saving}
            />
          </label>

          <label className="tp-modal-label">
            카테고리
            <input
              className="tp-modal-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 마케팅, HR, 개발, 문서..."
              maxLength={20}
              disabled={saving}
            />
          </label>

          <label className="tp-modal-label">
            템플릿 내용
            <textarea
              className="tp-modal-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="AI에게 보낼 프롬프트 내용을 입력하세요."
              rows={7}
              required
              disabled={saving}
            />
          </label>

          {/* API 실패 시 에러 메시지 표시 */}
          {error && <div className="tp-modal-error">{error}</div>}

          <div className="tp-modal-actions">
            <button type="button" className="tp-btn-cancel" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="tp-btn-save" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TemplatePanel: 채팅 페이지 우측 패널
//
// props:
//   onInsert          - 템플릿 클릭 시 입력창에 내용 삽입
//   onClose           - 패널 닫기
//   userTemplates     - DB에서 불러온 사용자 개인 템플릿 배열
//   onCreateTemplate  - 신규 생성 (async, 실패 시 throw)
//   onUpdateTemplate  - 수정 (async, 실패 시 throw)
//   onDeleteTemplate  - 삭제 (async, 실패 시 throw)
// ─────────────────────────────────────────────────────────────
function TemplatePanel({
  onInsert,
  onClose,
  userTemplates = [],
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}) {
  const [activeCategory, setActiveCategory] = useState('전체');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  // 'create' | 'edit' | 'copy-system'
  const [formMode, setFormMode] = useState('create');

  const tabsRef = useRef(null);

  // 세로 휠 → 가로 스크롤 변환 (마우스 휠로 카테고리 탭 가로 이동)
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // userTemplates prop이 바뀔 때만 재계산 (매 렌더마다 재생성 방지)
  const allTemplates = useMemo(
    () => [...SYSTEM_TEMPLATES, ...userTemplates],
    [userTemplates],
  );

  const categories = useMemo(
    () => ['전체', ...Array.from(new Set(allTemplates.map((t) => t.category)))],
    [allTemplates],
  );

  const filtered = useMemo(
    () =>
      activeCategory === '전체'
        ? allTemplates
        : allTemplates.filter((t) => t.category === activeCategory),
    [allTemplates, activeCategory],
  );

  // 개인 템플릿 삭제로 선택한 카테고리가 사라지면 '전체'로 자동 복귀
  useEffect(() => {
    if (activeCategory !== '전체' && !categories.includes(activeCategory)) {
      setActiveCategory('전체');
    }
  }, [categories, activeCategory]);

  // [핵심 설계]
  // - 사용자 템플릿 수정(edit): onUpdateTemplate 호출
  // - 시스템 템플릿 편집(copy-system): 원본 변경 없이 onCreateTemplate으로 새 개인 템플릿 생성
  // - 신규 생성(create): onCreateTemplate 호출
  // 성공 시 모달 닫기, 실패 시 TemplateFormModal의 catch에서 에러 표시
  const handleFormSave = async (data) => {
    if (formMode === 'edit' && editingTemplate && !editingTemplate.isSystem) {
      await onUpdateTemplate(editingTemplate.id, data);
    } else {
      // 신규 생성이거나 시스템 템플릿 복사 → 항상 새 개인 템플릿으로 저장
      await onCreateTemplate(data);
    }
    setFormOpen(false);
    setEditingTemplate(null);
  };

  // 사용자 템플릿 수정
  const openEdit = (tmpl) => {
    setFormMode('edit');
    setEditingTemplate(tmpl);
    setFormOpen(true);
  };

  // 시스템 템플릿 → 내 템플릿으로 복사하여 편집
  const openCopySystem = (tmpl) => {
    setFormMode('copy-system');
    setEditingTemplate(tmpl);
    setFormOpen(true);
  };

  // 새 템플릿 생성
  const openCreate = () => {
    setFormMode('create');
    setEditingTemplate(null);
    setFormOpen(true);
  };

  return (
    <aside className="template-panel">

      {/* ── 패널 헤더 ── */}
      <div className="tp-header">
        <div className="tp-header-left">
          <BookOpen size={15} />
          <span>템플릿 라이브러리</span>
        </div>
        <div className="tp-header-right">
          <button
            type="button"
            className="tp-icon-btn"
            onClick={openCreate}
            title="새 템플릿 추가"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="tp-icon-btn"
            onClick={onClose}
            title="닫기"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── 카테고리 탭 (가로 스크롤 가능) ── */}
      <div className="tp-category-tabs" ref={tabsRef}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`tp-cat-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 템플릿 목록 ── */}
      <div className="tp-list">
        {filtered.length === 0 ? (
          <div className="tp-empty">이 카테고리에 템플릿이 없습니다.</div>
        ) : (
          filtered.map((tmpl) => {
            // 미리보기용 텍스트: 줄바꿈을 공백으로 바꾼 단일 문자열 (한 번만 계산)
            const previewText = tmpl.content.replace(/\n/g, ' ');
            return (
              <div key={tmpl.id} className="tp-item">

                {/* 클릭하면 입력창에 템플릿 내용 삽입 */}
                <button
                  type="button"
                  className="tp-item-body"
                  onClick={() => onInsert(tmpl.content)}
                  title="클릭하여 입력창에 삽입"
                >
                  <div className="tp-item-title">{tmpl.title}</div>
                  <div className="tp-item-preview">
                    {previewText.length > 65
                      ? `${previewText.slice(0, 65)}…`
                      : previewText}
                  </div>
                  <span className="tp-item-cat-badge">{tmpl.category}</span>
                </button>

                <div className="tp-item-actions">
                  {tmpl.isSystem ? (
                    /* 시스템 템플릿: 복사하여 편집 버튼만 표시 */
                    <button
                      type="button"
                      className="tp-action-btn"
                      onClick={() => openCopySystem(tmpl)}
                      title="내 템플릿으로 복사하여 편집"
                    >
                      <Edit2 size={12} />
                    </button>
                  ) : (
                    /* 사용자 템플릿: 수정 + 삭제 */
                    <>
                      <button
                        type="button"
                        className="tp-action-btn"
                        onClick={() => openEdit(tmpl)}
                        title="수정"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        className="tp-action-btn tp-action-delete"
                        onClick={() => {
                          onDeleteTemplate(tmpl.id).catch(() => {});
                        }}
                        title="삭제"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 생성 / 수정 모달 ── */}
      {formOpen && (
        <TemplateFormModal
          template={editingTemplate}
          mode={formMode}
          onSave={handleFormSave}
          onClose={() => {
            setFormOpen(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </aside>
  );
}

export default TemplatePanel;
