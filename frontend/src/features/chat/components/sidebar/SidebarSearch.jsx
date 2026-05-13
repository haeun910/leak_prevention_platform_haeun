// 사이드바 검색 컴포넌트
// 역할:
// 1) 채팅 검색 입력창 표시
// 2) 사용자가 입력한 검색어를 부모 컴포넌트(Sidebar.jsx)로 전달
// 3) 검색어가 있을 때 X 버튼을 보여주고, 클릭 시 검색어 초기화
// 4) 실제 채팅 필터링 로직은 Sidebar.jsx에 남겨둠
function SidebarSearch({ searchText, onChangeSearchText, onClearSearchText }) {
  return (
    <div className="search-wrapper">
      {/* 검색 아이콘 */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="search-icon"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>

      {/* 검색 입력창 */}
      <input
        type="text"
        className="search-input"
        placeholder="검색"
        value={searchText}
        onChange={(e) => onChangeSearchText(e.target.value)}
      />

      {/* 검색어가 있을 때만 초기화 버튼 표시 */}
      {searchText && (
        <button
          className="search-clear-btn"
          onClick={onClearSearchText}
          title="검색어 지우기"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
}

export default SidebarSearch;