import { Plus } from 'lucide-react';

// 새 채팅 버튼 컴포넌트
// 역할:
// 1) 사이드바 상단의 "새 채팅" 버튼을 표시
// 2) 버튼 클릭 시 부모 컴포넌트(Sidebar.jsx)에서 전달받은 onNewChat 함수를 실행
// 3) 실제 새 채팅 생성 로직은 이 파일에 두지 않고, 상위 컴포넌트에서 처리하도록 분리

function NewChatButton({ onNewChat }) {
  return (
    <button className="new-chat-btn" onClick={onNewChat}>
      <Plus size={16} strokeWidth={2.5} />
      <span className="btn-text">새 채팅</span>
    </button>
  );
}

export default NewChatButton;