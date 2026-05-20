function SidebarSearch({ searchText, onChangeSearchText, onClearSearchText }) {
  return (
    <div className="search-wrapper">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="search-icon"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        type="text"
        className="search-input"
        name="veil-chat-search"
        placeholder="검색"
        value={searchText}
        onChange={(event) => onChangeSearchText(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck="false"
        inputMode="search"
      />

      {searchText && (
        <button
          className="search-clear-btn"
          onClick={onClearSearchText}
          title="검색어 지우기"
          type="button"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SidebarSearch;
