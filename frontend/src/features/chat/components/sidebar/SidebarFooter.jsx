import { useEffect, useState } from 'react';
import { ChevronRight, ShieldCheck, Settings, X } from 'lucide-react';
import {
  getPreferences,
  savePreferences,
  submitDepartmentChangeRequest,
} from '../../../../api/client';

function SidebarFooter({ userInfo, onGoDashboard, onLogout }) {
  const userName = userInfo.name || '사용자';
  const userDepartment = userInfo.department || '미지정';
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [personalInstructions, setPersonalInstructions] = useState('');
  const [requestedDepartment, setRequestedDepartment] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSettingsOpen) return;
    setSettingsMessage('');
    setSettingsError('');
    getPreferences()
      .then(({ data }) => setPersonalInstructions(data.personal_instructions || ''))
      .catch(() => setSettingsError('개인 설정을 불러오지 못했습니다.'));
  }, [isSettingsOpen]);

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setSettingsMessage('');
    setSettingsError('');
    setRequestedDepartment('');
    setRequestReason('');
  };

  const handleSaveInstructions = async () => {
    setSaving(true);
    setSettingsMessage('');
    setSettingsError('');
    try {
      await savePreferences({ personal_instructions: personalInstructions });
      setSettingsMessage('개인 지침이 저장되었습니다.');
    } catch {
      setSettingsError('개인 지침 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDepartmentRequest = async () => {
    const nextDepartment = requestedDepartment.trim();
    if (!nextDepartment) {
      setSettingsError('변경할 부서를 입력해 주세요.');
      return;
    }

    setSaving(true);
    setSettingsMessage('');
    setSettingsError('');
    try {
      await submitDepartmentChangeRequest({
        requested_department: nextDepartment,
        reason: requestReason.trim(),
      });
      setRequestedDepartment('');
      setRequestReason('');
      setSettingsMessage('부서 변경 요청이 관리자 대시보드로 전송되었습니다.');
    } catch (err) {
      setSettingsError(err.response?.data?.detail || '부서 변경 요청에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sidebar-footer">
        <div className="user-section">
          <div className="user-avatar" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.4} />
          </div>

          <div className="user-details">
            <div className="user-name">{userName}</div>
            <div className="user-role">{userDepartment}</div>
          </div>

          <button
            className="settings-gear-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="설정"
            type="button"
          >
            <Settings size={18} strokeWidth={2} />
          </button>
        </div>

        {userInfo.role === 'admin' && (
          <button className="dashboard-btn" onClick={onGoDashboard} type="button">
            대시보드
          </button>
        )}

        <button className="logout-btn" onClick={onLogout} type="button">
          로그아웃
        </button>
      </div>

      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={closeSettings}>
          <div className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modal-header">
              <h2 className="settings-modal-title">설정</h2>
              <button className="settings-modal-close" onClick={closeSettings} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="settings-modal-body">
              <section className="settings-section">
                <h3 className="settings-section-title">프로필</h3>
                <div className="settings-row">
                  <span className="settings-row-label">이름</span>
                  <span className="settings-row-value">{userName}</span>
                </div>
                <div className="settings-divider" />
                <div className="settings-row">
                  <span className="settings-row-label">부서</span>
                  <span className="settings-row-value">{userDepartment}</span>
                </div>
                <div className="settings-divider" />
                <div className="settings-row">
                  <span className="settings-row-label">계정</span>
                  <span className="settings-row-value">{userInfo.email || userInfo.empId || '-'}</span>
                </div>
              </section>

              <section className="settings-section">
                <h3 className="settings-section-title">개인 지침</h3>
                <p className="settings-password-desc">
                  답변 스타일, 업무 맥락, 선호하는 출력 형식을 저장하면 새 대화에도 적용됩니다.
                </p>
                <textarea
                  className="settings-textarea"
                  value={personalInstructions}
                  onChange={(event) => setPersonalInstructions(event.target.value)}
                  placeholder="예: 답변은 간결하게, 표가 필요하면 Markdown 표로 정리해 주세요."
                  rows={5}
                />
                <div className="settings-password-action">
                  <button className="settings-save-btn" onClick={handleSaveInstructions} disabled={saving} type="button">
                    저장
                  </button>
                </div>
              </section>

              <section className="settings-section">
                <h3 className="settings-section-title">부서 변경 요청</h3>
                <div className="settings-field-row settings-field-column">
                  <label className="settings-field-label">변경할 부서</label>
                  <input
                    className="settings-field-input"
                    value={requestedDepartment}
                    onChange={(event) => setRequestedDepartment(event.target.value)}
                    placeholder="예: 보안팀"
                    autoComplete="off"
                  />
                </div>
                <div className="settings-field-row settings-field-column">
                  <label className="settings-field-label">요청 사유</label>
                  <textarea
                    className="settings-textarea"
                    value={requestReason}
                    onChange={(event) => setRequestReason(event.target.value)}
                    placeholder="관리자가 확인할 수 있도록 간단히 적어주세요."
                    rows={3}
                  />
                </div>
                <button className="settings-nav-row settings-request-row" onClick={handleDepartmentRequest} disabled={saving} type="button">
                  <span className="settings-row-label">관리자에게 요청 보내기</span>
                  <ChevronRight size={16} color="#9ca3af" />
                </button>
              </section>

              {settingsError && <p className="settings-msg error settings-inline-msg">{settingsError}</p>}
              {settingsMessage && <p className="settings-msg success settings-inline-msg">{settingsMessage}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SidebarFooter;
