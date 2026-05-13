import { useState, useRef, useEffect, useCallback } from 'react'
import { SendHorizontal, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { previewMask } from '../../api/client'
import RiskBadge from './RiskBadge'

const DEBOUNCE_MS = 600

const RISK_ICON = {
  high:   <ShieldX size={15} color="var(--risk-high)" />,
  medium: <ShieldAlert size={15} color="var(--risk-medium)" />,
  low:    <ShieldCheck size={15} color="var(--risk-low)" />,
  none:   <ShieldCheck size={15} color="var(--text-muted)" />,
}

export default function InputArea({ onSend, disabled, inputRef }) {
  const [text, setText] = useState('')
  const [risk, setRisk] = useState({ level: 'none', entities: [] })
  const [analyzing, setAnalyzing] = useState(false)
  const textareaRef = useRef(null)
  const timerRef = useRef(null)

  // 텍스트 변경 시 디바운스 위험도 분석
  useEffect(() => {
    if (!text.trim()) {
      setRisk({ level: 'none', entities: [] })
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setAnalyzing(true)
      try {
        const { data } = await previewMask({ text })
        setRisk({ level: data.overall_risk, entities: data.detected_entities })
      } catch {
        setRisk({ level: 'none', entities: [] })
      } finally {
        setAnalyzing(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [text])

  // 자동 높이 조절
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled) return
    onSend(text.trim(), risk)
    setText('')
    setRisk({ level: 'none', entities: [] })
    textareaRef.current?.focus()
  }, [text, risk, disabled, onSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      setTimeout(() => {
        textareaRef.current?.focus() 
      }, 0)
    }
  }

  const setRefs = (el) => {
  textareaRef.current = el
  if (inputRef) inputRef.current = el
}


  const hasRisk = risk.level !== 'none' && risk.entities.length > 0

  return (
    <div style={styles.root}>
      {/* 위험도 표시 바 */}
      {text.trim() && (
        <div style={styles.riskBar}>
          <div style={styles.riskLeft}>
            {analyzing
              ? <span style={styles.analyzing}>분석 중...</span>
              : (
                <>
                  {RISK_ICON[risk.level]}
                  <RiskBadge level={risk.level} />
                  {hasRisk && (
                    <span style={styles.riskEntities}>
                      {risk.entities.map(e => e.masked).join('  ')}
                    </span>
                  )}
                  {!hasRisk && (
                    <span style={styles.riskSafe}>감지된 민감 정보 없음</span>
                  )}
                </>
              )
            }
          </div>
          {hasRisk && (
            <span style={styles.riskHint}>전송 시 자동 마스킹됩니다.</span>
          )}
        </div>
      )}

      {/* 입력창 */}
      <div style={styles.inputWrap}>
        <textarea
          ref={setRefs}
          style={styles.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요.  (Shift+Enter 줄바꿈)"
          disabled={disabled}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            background: text.trim() && !disabled ? 'var(--accent)' : 'var(--bg-hover)',
            color: text.trim() && !disabled ? '#fff' : 'var(--text-muted)',
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
          }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="전송 (Enter)"
        >
          <SendHorizontal size={16} />
        </button>
      </div>

      <p style={styles.hint}>Enter 전송 · Shift+Enter 줄바꿈</p>
    </div>
  )
}

const styles = {
  root: {
    padding: '0 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  riskBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    minHeight: '34px',
  },
  riskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  analyzing: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  riskSafe: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  riskEntities: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
  },
  riskHint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  inputWrap: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 10px 10px 14px',
  },
  textarea: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    maxHeight: '160px',
    overflowY: 'auto',
  },
  sendBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background var(--transition)',
    border: 'none',
  },
  hint: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
}
