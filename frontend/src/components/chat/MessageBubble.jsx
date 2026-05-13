import { useState } from 'react'
import { Pencil, Check, X, ShieldAlert } from 'lucide-react'
import RiskBadge from './RiskBadge'

export default function MessageBubble({ message, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const isUser = message.role === 'user'

  const handleSave = () => {
    if (draft.trim() && draft !== message.content) {
      onEdit?.(message.id, draft.trim())
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(message.content)
    setEditing(false)
  }

  return (
    <div style={{ ...styles.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {/* AI 아바타 */}
      {!isUser && (
        <div style={styles.avatar}>
          <ShieldAlert size={14} color="var(--accent)" />
        </div>
      )}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '6px',
        alignItems: isUser ? 'flex-end' : 'flex-start' }}>

        {/* 버블 */}
        <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.aiBubble) }}>
          {editing ? (
            <textarea
              style={styles.editArea}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
                if (e.key === 'Escape') handleCancel()
              }}
              autoFocus
              rows={Math.max(2, draft.split('\n').length)}
            />
          ) : (
            <p style={styles.text}>{message.content}</p>
          )}

          {/* 수정 컨트롤 */}
          {isUser && (
            <div style={{ ...styles.editControls, opacity: editing ? 1 : undefined }}
              className="edit-controls">
              {editing ? (
                <>
                  <button style={styles.iconBtn} onClick={handleSave} title="저장 (Enter)">
                    <Check size={13} />
                  </button>
                  <button style={styles.iconBtn} onClick={handleCancel} title="취소 (Esc)">
                    <X size={13} />
                  </button>
                </>
              ) : (
                <button style={styles.iconBtn} onClick={() => setEditing(true)} title="메시지 수정">
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 마스킹 정보 */}
        {message.wasMasked && message.entities?.length > 0 && (
          <div style={styles.maskInfo}>
            <RiskBadge level={message.riskLevel} />
            <span style={styles.maskDetail}>
              {message.entities.map(e => e.masked).join('  ')}
            </span>
          </div>
        )}

        <span style={styles.time}>
          {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit',
          })}
          {message.edited && <span style={{ marginLeft: '4px', opacity: 0.6 }}>(수정됨)</span>}
        </span>
      </div>
    </div>
  )
}

const styles = {
  row: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    padding: '4px 0',
  },
  avatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'var(--accent-subtle)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  bubble: {
    padding: '11px 15px',
    borderRadius: 'var(--radius-md)',
    position: 'relative',
  },
  userBubble: {
    background: 'var(--accent)',
    borderBottomRightRadius: '4px',
  },
  aiBubble: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderBottomLeftRadius: '4px',
  },
  text: {
    fontSize: '14px',
    lineHeight: '1.65',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  editArea: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontSize: '14px',
    lineHeight: '1.65',
    resize: 'none',
    width: '100%',
    minWidth: '200px',
  },
  editControls: {
    position: 'absolute',
    top: '-28px',
    right: '0',
    display: 'flex',
    gap: '4px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px',
  },
  iconBtn: {
    background: 'none',
    color: 'var(--text-secondary)',
    padding: '3px 5px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background var(--transition)',
  },
  maskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '5px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
  },
  maskDetail: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  time: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    paddingLeft: '2px',
    paddingRight: '2px',
  },
}
