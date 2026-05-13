// =====================================================
// generateChatTitle
// 역할: 사용자의 첫 메시지를 분석해 의미 있는 채팅 제목을 반환하는 순수 함수
//
// - 구두점 제거 및 요청성 어미("알려줘", "해주세요" 등) 잘라내기
// - 22자 초과 시 말줄임표 처리
// - 백엔드 연동 시 이 함수 내부만 LLM API 호출로 교체하면 됨
//
// 별도 파일로 분리한 이유:
//   기존에 ChatPage.jsx 최상단에 인라인 정의되어 있어
//   다른 컴포넌트에서 재사용하거나 단독 테스트가 불가능했음
// =====================================================
export function generateChatTitle(userMessage) {
  // 구두점 제거 및 공백 정규화
  let title = userMessage
    .replace(/[.?!。？！,，]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 제목에서 제거할 요청성 어미 목록
  const cutPhrases = [
    '알려주세요', '알려줘', '해주세요', '해줘',
    '알고 싶어', '알고싶어', '설명해줘', '설명해주세요',
    '에 대해서', '에 대해', '이란 무엇인가',
    '가 뭐야', '이 뭐야', '는 뭐야', '을 알려줘', '를 알려줘',
  ];

  // 어미가 나오는 위치부터 뒤를 잘라냄 (앞 3글자 이상일 때만 적용)
  for (const phrase of cutPhrases) {
    const idx = title.indexOf(phrase);
    if (idx > 3) {
      title = title.slice(0, idx).trim();
      break;
    }
  }

  // 최대 22자 제한 (초과 시 말줄임표 추가)
  if (title.length > 22) {
    title = title.slice(0, 22).trimEnd() + '...';
  }

  return title || '새 채팅';
}
