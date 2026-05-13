import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import './ChatWindow.css';

function ChatWindow({ messages, isLoading, onEditMessage }) {
  const messagesEndRef = useRef(null);

  // 새 메시지가 추가될 때 자동으로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h2>무엇을 도와드릴까요?</h2>
            <p>입력하신 정보 중 민감한 사내 정보는 안전하게 마스킹 처리되어 AI에게 전달됩니다.</p>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble 
            key={message.id} 
            message={message}
            onEditMessage={onEditMessage}
          />
        ))}

        {isLoading && (
          <div className="loading-message">
            <div className="loading-bubble">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatWindow;