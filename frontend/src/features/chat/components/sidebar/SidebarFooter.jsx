import { useState } from 'react';
import { Settings, X, ChevronRight, ChevronLeft } from 'lucide-react';

// =====================================================
// SidebarFooter 컴포넌트
// 역할:
// 1) 로그인한 사용자 이름, 부서 정보 표시
// 2) 톱니바퀴 아이콘 클릭 → 설정 모달 오픈
//    - 프로필 정보 (아바타, 이름, 부서) 표시
//    - 비밀번호 변경 기능
// 3) admin 계정인 경우 대시보드 이동 버튼 표시
// 4) 로그아웃 버튼 표시
// =====================================================
function SidebarFooter({ userInfo, onGoDashboard, onLogout }) {
  const userName       = userInfo.name       || '사용자';
  const userDepartment = userInfo.department || '미지정';

  // 설정 모달 열림 여부
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 모달 내 현재 뷰
  // 'profile'  → 기본 프로필 화면
  // 'password' → 비밀번호 변경 화면
  const [settingsView, setSettingsView] = useState('profile');

  // 비밀번호 변경 폼 상태
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });

  // 유효성 검사 오류 메시지
  const [passwordError,   setPasswordError]   = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 설정 모달 닫기 + 모든 상태 초기화
  const closeSettings = () => {
    setIsSettingsOpen(false);
    setSettingsView('profile');
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };

  // 비밀번호 변경 화면으로 전환
  const goToPasswordView = () => {
    setSettingsView('password');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  // 프로필 화면으로 돌아가기
  const goToProfileView = () => {
    setSettingsView('profile');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  // 비밀번호 변경 처리
  // 유효성 검사 → 현재 비밀번호 대조 → localStorage 업데이트
  const handlePasswordChange = () => {
    setPasswordError('');
    setPasswordSuccess('');

    // 필수 입력 체크
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError('모든 항목을 입력해주세요.');
      return;
    }

    // 새 비밀번호 최소 길이 체크
    if (passwordForm.next.length < 4) {
      setPasswordError('새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    // 새 비밀번호 일치 확인
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // localStorage에서 현재 사용자 찾기
    const users     = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === userInfo.email);

    if (userIndex === -1) {
      setPasswordError('사용자 정보를 찾을 수 없습니다.');
      return;
    }

    // 현재 비밀번호 대조
    if (users[userIndex].password !== passwordForm.current) {
      setPasswordError('현재 비밀번호가 올바르지 않습니다.');
      return;
    }

    // 비밀번호 업데이트 후 저장
    users[userIndex].password = passwordForm.next;
    localStorage.setItem('users', JSON.stringify(users));

    // 성공 메시지 표시 후 폼 초기화
    setPasswordSuccess('비밀번호가 변경되었습니다.');
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  // Enter 키로 비밀번호 변경 제출
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePasswordChange();
    }
  };

  return (
    <>
      <div className="sidebar-footer">

        {/* 사용자 프로필 + 톱니바퀴 버튼 */}
        <div className="user-section">
          <div className="user-avatar">
            {userInfo.name ? userInfo.name.charAt(0) : 'U'}
          </div>

          <div className="user-details">
            <div className="user-name">{userName}</div>
            <div className="user-role">({userDepartment})</div>
          </div>

          {/* 설정 버튼: hover 시 표시, 클릭 시 설정 모달 오픈 */}
          <button
            className="settings-gear-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="설정"
          >
            <Settings size={18} strokeWidth={2} />
          </button>
        </div>

        {/* admin 계정일 때만 대시보드 이동 버튼 표시 */}
        {userInfo.role === 'admin' && (
          <button className="dashboard-btn" onClick={onGoDashboard}>
            대시보드
          </button>
        )}

        {/* 로그아웃 버튼 */}
        <button className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>

      {/* ── 설정 모달 ── */}
      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={closeSettings}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>

            {/* ── 모달 헤더 ── */}
            <div className="settings-modal-header">
              {/* 비밀번호 변경 뷰일 때 뒤로가기 버튼 표시 */}
              {settingsView === 'password' ? (
                <button className="settings-back-btn" onClick={goToProfileView}>
                  <ChevronLeft size={18} />
                  <span>뒤로</span>
                </button>
              ) : (
                <h2 className="settings-modal-title">설정</h2>
              )}
              <button className="settings-modal-close" onClick={closeSettings}>
                <X size={18} />
              </button>
            </div>

            <div className="settings-modal-body">

              {/* ══ 프로필 뷰 ══ */}
              {settingsView === 'profile' && (
                <>
                  <section className="settings-section">
                    <h3 className="settings-section-title">프로필</h3>

                    <div className="settings-row">
                      <span className="settings-row-label">아바타</span>
                      <div className="settings-avatar">
                        {userInfo.name ? userInfo.name.charAt(0) : 'U'}
                      </div>
                    </div>
                    <div className="settings-divider" />

                    <div className="settings-row">
                      <span className="settings-row-label">성명</span>
                      <span className="settings-row-value">{userName}</span>
                    </div>
                    <div className="settings-divider" />

                    <div className="settings-row">
                      <span className="settings-row-label">부서</span>
                      <span className="settings-row-value">{userDepartment}</span>
                    </div>
                    <div className="settings-divider" />

                    <div className="settings-row">
                      <span className="settings-row-label">이메일</span>
                      <span className="settings-row-value">{userInfo.email || '-'}</span>
                    </div>
                  </section>

                  {/* 보안 섹션: 비밀번호 변경 버튼만 표시 */}
                  <section className="settings-section">
                    <h3 className="settings-section-title">보안</h3>
                    <div className="settings-divider" />
                    {/* 클릭 시 비밀번호 변경 뷰로 전환 */}
                    <button className="settings-nav-row" onClick={goToPasswordView}>
                      <span className="settings-row-label">비밀번호 변경</span>
                      <ChevronRight size={16} color="#9ca3af" />
                    </button>
                  </section>
                </>
              )}

              {/* ══ 비밀번호 변경 뷰 ══ */}
              {settingsView === 'password' && (
                <section className="settings-section">
                  <h3 className="settings-section-title">비밀번호 변경</h3>
                  <p className="settings-password-desc">
                    현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
                  </p>

                  <div className="settings-password-fields">
                    <div className="settings-field-row">
                      <label className="settings-field-label">현재 비밀번호</label>
                      <input
                        className="settings-field-input"
                        type="password"
                        placeholder="현재 비밀번호"
                        value={passwordForm.current}
                        onChange={e => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <div className="settings-field-row">
                      <label className="settings-field-label">새 비밀번호</label>
                      <input
                        className="settings-field-input"
                        type="password"
                        placeholder="새 비밀번호 (4자 이상)"
                        value={passwordForm.next}
                        onChange={e => setPasswordForm(prev => ({ ...prev, next: e.target.value }))}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <div className="settings-field-row">
                      <label className="settings-field-label">비밀번호 확인</label>
                      <input
                        className="settings-field-input"
                        type="password"
                        placeholder="새 비밀번호 확인"
                        value={passwordForm.confirm}
                        onChange={e => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                  </div>

                  {passwordError   && <p className="settings-msg error">{passwordError}</p>}
                  {passwordSuccess && <p className="settings-msg success">{passwordSuccess}</p>}

                  <div className="settings-password-action">
                    <button className="settings-save-btn" onClick={handlePasswordChange}>
                      변경
                    </button>
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SidebarFooter;
