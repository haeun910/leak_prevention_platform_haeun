import { useEffect, useState } from 'react';
import { FileWarning, ShieldCheck } from 'lucide-react';

// =====================================================
// MaskingDemo — 랜딩 페이지 미리보기용 마스킹 시연
//
// 흐름 (장면마다 반복):
//   typing   → 문장이 한 글자씩 입력됨
//   detected → 민감정보 구간을 빨간색으로 표시하고 위험도 안내
//   masked   → 해당 구간이 [전화번호] 같은 라벨로 바뀜
//   replied  → 마스킹된 문장 기준으로 AI 답변 표시
//
// 실제 API를 호출하지 않는 시연용 화면이며,
// 라벨·위험도 점수는 백엔드 파이프라인 규칙(high 10 / medium 5 / low 1, 유형 2종 이상 +5)에 맞춤
// =====================================================

const SCENES = [
  {
    parts: [
      { text: '환불 계좌 국민은행 ' },
      { text: '123456-01-234567', label: '[계좌번호]' },
      { text: ', 고객 연락처 ' },
      { text: '010-2345-6789', label: '[전화번호]' },
      { text: '로 안내 메일 써줘' },
    ],
    risk: 'high',
    reply: '계좌번호와 연락처를 가린 문장으로 안내 메일 초안을 작성할게요.',
  },
  {
    parts: [
      { text: '김민준', label: '[이름]' },
      { text: ' 팀장에게 ' },
      { text: '스카이넷 2차', label: '[프로젝트명]' },
      { text: ' 진행 상황을 보고하는 메일 써줘' },
    ],
    risk: 'medium',
    reply: '이름과 프로젝트명은 가리고, 직책은 그대로 두었어요.',
  },
  {
    parts: [
      { text: '운영 DB 비밀번호 ' },
      { text: 'Veil#2026!', label: '[비밀번호]' },
      { text: '를 서버 ' },
      { text: '192.168.0.12', label: '[IPv4주소]' },
      { text: ' 설정에 반영하는 방법 알려줘' },
    ],
    risk: 'high',
    reply: '비밀번호와 IP 주소를 제외한 내용으로 설정 방법을 안내할게요.',
  },
];

const RISK_TEXT = { high: '위험도 높음', medium: '위험도 보통', low: '위험도 낮음' };

const TYPE_SPEED = 38;
const PHASE_DELAY = { detected: 1100, masked: 900, replied: 2800 };

function sceneLength(scene) {
  return scene.parts.reduce((sum, part) => sum + part.text.length, 0);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function MaskingDemo() {
  const reduced = prefersReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [typed, setTyped] = useState(reduced ? sceneLength(SCENES[0]) : 0);
  const [phase, setPhase] = useState(reduced ? 'replied' : 'typing');

  const scene = SCENES[sceneIndex];
  const total = sceneLength(scene);
  const hits = scene.parts.filter((part) => part.label);

  useEffect(() => {
    // 움직임 줄이기 설정이면 첫 장면의 마스킹 결과만 정적으로 보여줌
    if (reduced) return undefined;

    let timer;
    if (phase === 'typing') {
      timer = typed < total
        ? setTimeout(() => setTyped((n) => n + 1), TYPE_SPEED)
        : setTimeout(() => setPhase('detected'), 500);
    } else if (phase === 'detected') {
      timer = setTimeout(() => setPhase('masked'), PHASE_DELAY.detected);
    } else if (phase === 'masked') {
      timer = setTimeout(() => setPhase('replied'), PHASE_DELAY.masked);
    } else {
      timer = setTimeout(() => {
        setSceneIndex((i) => (i + 1) % SCENES.length);
        setTyped(0);
        setPhase('typing');
      }, PHASE_DELAY.replied);
    }
    return () => clearTimeout(timer);
  }, [phase, typed, total, reduced]);

  // 입력된 글자 수만큼 각 구간을 잘라서 렌더링
  let remaining = typed;
  const rendered = scene.parts.map((part, i) => {
    const visible = part.text.slice(0, Math.max(0, remaining));
    remaining -= part.text.length;
    if (!visible) return null;
    if (part.label && (phase === 'masked' || phase === 'replied')) {
      return <span key={i} className="demo-mask">{part.label}</span>;
    }
    if (part.label && phase === 'detected') {
      return <span key={i} className="demo-hit">{visible}</span>;
    }
    return <span key={i}>{visible}</span>;
  });

  const scanning = phase === 'typing';
  const detected = !scanning;

  return (
    <>
      <div className={`risk-card demo-risk ${detected ? `is-${scene.risk}` : ''}`}>
        {detected ? <FileWarning size={18} /> : <ShieldCheck size={18} />}
        <div>
          <strong>{detected ? `민감정보 ${hits.length}건 감지 · ${RISK_TEXT[scene.risk]}` : '입력 내용 실시간 검사 중'}</strong>
          <p>
            {detected
              ? `${hits.map((part) => part.label.replace(/[[\]]/g, '')).join(', ')} 자동 마스킹`
              : '정규식과 NER 모델이 전송 전에 문장을 확인합니다'}
          </p>
        </div>
      </div>
      <div className="message-row user demo-input" aria-hidden="true">
        {rendered}
        {scanning && <span className="demo-caret" />}
      </div>
      <div className={`message-row assistant demo-reply ${phase === 'replied' ? 'is-visible' : ''}`} aria-hidden="true">
        {scene.reply}
      </div>
    </>
  );
}

export default MaskingDemo;
