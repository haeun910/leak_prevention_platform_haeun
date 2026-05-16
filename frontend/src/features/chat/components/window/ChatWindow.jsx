import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import './ChatWindow.css';

function ChatWindow({ messages, isLoading, onEditMessage }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.length === 0 && !isLoading && (
          <div className="empty-chat">
            <div className="empty-icon">AI</div>
            <h2>무엇을 도와드릴까요?</h2>
            <p>입력하신 민감정보는 자동으로 마스킹되어 안전하게 처리됩니다.</p>
          </div>
        )}

        {messages.map((message) => (
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
                <span />
                <span />
                <span />
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
