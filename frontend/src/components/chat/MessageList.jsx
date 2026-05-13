import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import { Loader2 } from 'lucide-react'

export default function MessageList({ messages, onEditMessage, loading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyTitle}>무엇이든 물어보세요.</p>
        <p style={styles.emptySub}>
          입력한 내용은 전송 전 자동으로 검사되며<br />
          민감한 정보는 마스킹 처리됩니다.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.list}>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} onEdit={onEditMessage} />
      ))}
      {loading && (
        <div style={styles.typing}>
          <Loader2 size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={styles.typingText}>응답 생성 중</span>
        </div>
      )}
      <div ref={bottomRef} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const styles = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '24px 20px',
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  emptySub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: 1.7,
  },
  typing: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    paddingLeft: '40px',
  },
  typingText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
}
