import { useRef, useEffect, useState } from 'react';
import { Paperclip, Send, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { previewMask } from '../../../../api/client';
import './InputBox.css';

const DEBOUNCE_MS = 600;

const RISK_META = {
  high: {
    label: 'HIGH',
    icon: ShieldX,
    className: 'risk-high',
  },
  medium: {
    label: 'MEDIUM',
    icon: ShieldAlert,
    className: 'risk-medium',
  },
  low: {
    label: 'LOW',
    icon: ShieldCheck,
    className: 'risk-low',
  },
  none: {
    label: 'SAFE',
    icon: ShieldCheck,
    className: 'risk-none',
  },
};

const LLM_OPTIONS = [
  { value: 'openai', label: 'GPT', detail: 'OpenAI' },
  { value: 'anthropic', label: 'Claude', detail: 'Anthropic' },
  { value: 'gemini', label: 'Gemini', detail: 'Google' },
];

// =====================================================
// InputBox 컴포넌트
// 역할:
// 1) 사용자가 프롬프트를 입력하는 입력창
// 2) Enter로 전송 / Shift+Enter로 줄바꿈
// 3) 입력 내용에 따라 textarea 높이 자동 조절
// 4) AI 응답 완료 후 자동 포커스 (마우스 클릭 없이 연속 입력 가능)
// 5) 입력창 하단 보안 안내 문구 표시
// =====================================================
function InputBox({
  inputText,
  onInputChange,
  onSend,
  isLoading,
  llmProvider = 'openai',
  onChangeLlmProvider,
}) {
  const textareaRef = useRef(null);
  const timerRef = useRef(null);
  const [risk, setRisk] = useState({ level: 'none', entities: [] });
  const [analyzing, setAnalyzing] = useState(false);

  // ===== 실시간 민감정보 검증 =====
  // 입력 중에는 /api/mask/preview만 호출해 LLM 없이 마스킹 위험도를 미리 보여준다.
  useEffect(() => {
    if (!inputText.trim()) {
      clearTimeout(timerRef.current);
      setRisk({ level: 'none', entities: [] });
      setAnalyzing(false);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setAnalyzing(true);
      try {
        const { data } = await previewMask({ text: inputText });
        setRisk({
          level: data.overall_risk || 'none',
          entities: data.detected_entities || [],
        });
      } catch (err) {
        console.error('실시간 검증 실패:', err);
        setRisk({ level: 'none', entities: [] });
      } finally {
        setAnalyzing(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [inputText]);

  // ===== 높이 자동 조절 =====
  // inputText가 바뀔 때마다 textarea 높이를 내용에 맞게 재조정
  // height를 auto로 초기화 후 scrollHeight로 다시 설정해야 줄어드는 것도 반영됨
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputText]);

  // ===== 자동 포커스 =====
  // isLoading이 false로 바뀌는 순간 입력창에 자동 포커스
  // - 전송 후 AI 응답 완료 시 자동 포커스 → 마우스 클릭 없이 바로 다음 메시지 입력 가능
  // - 컴포넌트 첫 마운트 시(초기 진입, 홈→채팅 전환)도 실행되어 즉시 입력 가능 상태로 시작
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  // ===== Enter 전송 / Shift+Enter 줄바꿈 =====
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // 빈 문자열이거나 AI 응답 대기 중이면 전송하지 않음
      if (inputText.trim() && !isLoading) {
        onSend();
      }
    }
  };

  // ===== 전송 버튼 클릭 =====
  const handleSendClick = () => {
    if (inputText.trim() && !isLoading) {
      onSend();
    }
  };

  const riskMeta = RISK_META[risk.level] || RISK_META.none;
  const RiskIcon = riskMeta.icon;
  const hasInput = Boolean(inputText.trim());
  const hasRisk = risk.entities.length > 0 && risk.level !== 'none';
  const detectedLabels = [...new Set(
    risk.entities.map((entity) => entity.entity_type || entity.masked).filter(Boolean)
  )];

  return (
    <div className="input-box">
      <div className="input-container">
        <div className="composer-toolbar">
          <div className="composer-toolbar-copy">
            <span className="toolbar-title">응답 모델</span>
            <span className="toolbar-subtitle">전송 전 사용하고 싶은 모델을 선택해 주세요.</span>
          </div>
          <div className="provider-segment" role="group" aria-label="LLM provider 선택">
            {LLM_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`provider-option ${llmProvider === option.value ? 'active' : ''}`}
                onClick={() => onChangeLlmProvider?.(option.value)}
                disabled={isLoading}
                title={option.detail}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {hasInput && (
          <div className={`live-risk-bar ${riskMeta.className}`}>
            <div className="live-risk-left">
              {analyzing ? (
                <span className="live-risk-loading">실시간 검증 중...</span>
              ) : (
                <>
                  <RiskIcon size={16} />
                  <span className="live-risk-badge">{riskMeta.label}</span>
                  {hasRisk ? (
                    <span className="live-risk-text">
                      {detectedLabels.join(', ')} 감지됨
                    </span>
                  ) : (
                    <span className="live-risk-text">감지된 민감정보 없음</span>
                  )}
                </>
              )}
            </div>
            {hasRisk && (
              <span className="live-risk-hint">전송 시 자동 마스킹됩니다.</span>
            )}
          </div>
        )}

        {/* 입력 UI 박스 (첨부 버튼 + textarea + 전송 버튼) */}
        <div className="input-wrapper">

          {/* 파일 첨부 버튼 (현재 미구현 → 비활성화) */}
          <button
            className="attach-btn-inside"
            disabled
            title="파일 첨부 (준비 중)"
          >
            <Paperclip size={20} />
          </button>

          {/* 텍스트 입력창 */}
          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="메시지를 입력하세요..."
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />

          {/* 전송 버튼: 입력값이 없거나 로딩 중이면 비활성화 */}
          <button
            className="send-btn"
            onClick={handleSendClick}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner">⏳</span>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        {/* 하단 안내 문구 */}
        <div className="input-notice">
          <p className="notice-line">
            개인정보 및 민감정보는 자동으로 마스킹됩니다.
          </p>
          <p className="notice-line">
            AI가 생성한 응답에는 오류가 포함될 수 있습니다. 중요한 업무 활용 전 내용을 검토해 주세요.
          </p>
        </div>

      </div>
    </div>
  );
}

export default InputBox;
