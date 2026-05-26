import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { previewMask } from '../../../../api/client';
import { labelEntityType } from '../../../../utils/entityLabels';
import './InputBox.css';

const DEBOUNCE_MS = 600;

const RISK_META = {
  high: { label: 'HIGH', icon: ShieldX, className: 'risk-high' },
  medium: { label: 'MEDIUM', icon: ShieldAlert, className: 'risk-medium' },
  low: { label: 'LOW', icon: ShieldCheck, className: 'risk-low' },
  none: { label: 'SAFE', icon: ShieldCheck, className: 'risk-none' },
};

const LLM_OPTIONS = [
  { value: 'openai', label: 'GPT', detail: 'OpenAI' },
  { value: 'claude', label: 'Claude', detail: 'claude' },
  { value: 'gemini', label: 'Gemini', detail: 'Google' },
];

function InputBox({
  inputText,
  onInputChange,
  onSend,
  isLoading,
  llmProvider = 'openai',
  onChangeLlmProvider,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);
  const [risk, setRisk] = useState({ level: 'none', entities: [] });
  const [analyzing, setAnalyzing] = useState(false);

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputText]);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (inputText.trim() && !isLoading) {
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (inputText.trim() && !isLoading) {
      onSend();
    }
  };

  const handleAttachClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const snippets = [];
    for (const file of files) {
      if (file.size > 200 * 1024) {
        snippets.push(`[첨부 파일: ${file.name}]\n파일이 200KB를 넘어 본문 미리보기 없이 첨부명만 추가되었습니다.`);
        continue;
      }

      try {
        const content = await file.text();
        snippets.push(`[첨부 파일: ${file.name}]\n${content}`);
      } catch {
        snippets.push(`[첨부 파일: ${file.name}]\n이 파일은 텍스트로 읽을 수 없어 파일명만 추가되었습니다.`);
      }
    }

    const nextText = [inputText.trim(), snippets.join('\n\n')].filter(Boolean).join('\n\n');
    onInputChange(nextText);
    event.target.value = '';
  };

  const riskMeta = RISK_META[risk.level] || RISK_META.none;
  const RiskIcon = riskMeta.icon;
  const hasInput = Boolean(inputText.trim());
  const hasRisk = risk.entities.length > 0 && risk.level !== 'none';
  const detectedLabels = [...new Set(
    risk.entities.map((entity) => labelEntityType(entity.entity_type || entity.masked)).filter(Boolean)
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
                    <span className="live-risk-text">{detectedLabels.join(', ')} 감지됨</span>
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

        <div className="input-wrapper">
          <button
            className="attach-btn-inside"
            onClick={handleAttachClick}
            disabled={isLoading}
            title="파일 첨부"
            type="button"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json,.log,.xml,.yaml,.yml"
            multiple
            hidden
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="메시지를 입력하세요..."
            value={inputText}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />

          <button
            className="send-btn"
            onClick={handleSendClick}
            disabled={!inputText.trim() || isLoading}
            type="button"
          >
            {isLoading ? (
              <span className="loading-spinner" aria-label="답변 생성 중" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>

        <div className="input-notice">
          <p className="notice-line">개인정보 및 민감정보는 자동으로 마스킹됩니다.</p>
          <p className="notice-line">AI가 생성한 응답에는 오류가 포함될 수 있습니다. 중요한 업무 활용 전 내용을 검토해 주세요.</p>
        </div>
      </div>
    </div>
  );
}

export default InputBox;
