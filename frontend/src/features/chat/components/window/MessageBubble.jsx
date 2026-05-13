import { useState, useEffect, useRef } from 'react';
import { Check, Copy, Pencil } from 'lucide-react';
import { useModal } from '../../../../components/AppModal';
import './MessageBubble.css';

// =====================================================
// 시간 포맷 유틸 함수 (순수 함수 → 컴포넌트 외부에 정의)
// 역할: ISO timestamp를 "오전 9:05" 형식으로 변환
// 컴포넌트 안에 두면 렌더링마다 재생성되므로 밖으로 분리
// =====================================================
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${ampm} ${displayHours}:${displayMinutes}`;
}

// =====================================================
// MessageBubble 컴포넌트
// 역할:
// 1) 사용자/AI 메시지를 다르게 표시 (오른쪽/왼쪽 정렬)
// 2) hover 시 복사 버튼 표시
// 3) 사용자 메시지에 편집 기능 제공
// =====================================================
function MessageBubble({ message, onEditMessage }) {
  const { showAlert } = useModal();
  // 현재 편집 모드 여부
  const [isEditing, setIsEditing] = useState(false);

  // 편집 textarea에 표시할 텍스트
  const [editText, setEditText] = useState('');

  // 복사 성공 여부 (true일 때 체크 아이콘으로 1.5초간 변경)
  const [copySuccess, setCopySuccess] = useState(false);

  // 편집 textarea 높이 자동 조절용 ref
  const textareaRef = useRef(null);

  // 편집 중 textarea 높이를 내용에 맞게 자동 조절
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [editText, isEditing]);

  // 메시지 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopySuccess(true);

      // 1.5초 뒤 다시 기본 아이콘 상태로 복귀
      setTimeout(() => setCopySuccess(false), 1500);
    } catch (err) {
      console.error('복사 실패:', err);
      await showAlert('복사에 실패했습니다.');
    }
  };

  // 편집 시작
  const startEdit = () => {
    setEditText(message.text);
    setIsEditing(true);
  };

  // 편집 취소
  const cancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  // 편집 저장
  const saveEdit = async () => {
    if (!editText.trim()) {
      await showAlert('메시지를 입력해주세요.');
      return;
    }

    // 부모(ChatPage)에게 수정 내용 전달
    onEditMessage(message.id, editText.trim());

    setIsEditing(false);
    setEditText('');
  };

  // Enter = 저장, Shift+Enter = 줄바꿈
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
  };

  // 메시지 주체 판별 (role 값은 프로젝트 전체에서 'user' / 'assistant'로 통일)
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
      <div className={`message-row ${isUser ? 'user-message' : 'ai-message'}`}>
        <div className={`message-body ${isEditing ? 'editing' : ''}`}>
          {isEditing ? (
            // =========================
            // 편집 모드
            // =========================
            <div className="edit-mode">
              <textarea
                ref={textareaRef}
                className="edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="edit-actions">
                <button className="edit-cancel-btn" onClick={cancelEdit}>
                  취소
                </button>
                <button className="edit-save-btn" onClick={saveEdit}>
                  저장
                </button>
              </div>
            </div>
          ) : (
            // =========================
            // 일반 표시 모드
            // =========================
            <>
              {/* 메시지 본문 */}
              <div className="message-text">{message.text}</div>

              {/* 사용자 메시지에 마스킹 감지 정보가 있을 때만 표시 */}
              {isUser && message.detectedItems && message.detectedItems.length > 0 && (
                <div className="detected-info">
                  🔒 {message.detectedItems.length}개 항목 마스킹됨
                  <span className="detected-items">
                    ({message.detectedItems.join(', ')})
                  </span>
                </div>
              )}

              <div className="message-footer">
                {/* 시간 표시 */}
                <div className="message-time">{formatTime(message.timestamp)}</div>

                {/* hover 시 나타나는 액션 버튼 */}
                <div className="message-actions">
                  {/* 복사 버튼 */}
                  <button className="copy-btn" onClick={handleCopy} title="복사">
                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  </button>

                  {/* 편집 버튼은 사용자 메시지에만 표시 */}
                  {isUser && (
                    <button className="edit-btn" onClick={startEdit} title="편집">
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;