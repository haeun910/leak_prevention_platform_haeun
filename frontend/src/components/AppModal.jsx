import { createContext, useContext, useState, useCallback, useRef } from 'react';
import './AppModal.css';

// =====================================================
// AppModal — 전역 모달 시스템
//
// 역할:
//   window.confirm / window.prompt / window.alert 를 커스텀 모달로 대체
//   앱 어디서든 useModal() 훅으로 호출 가능
//
// 제공하는 함수 (모두 Promise 반환 → async/await 사용):
//   showConfirm(message)              → 확인: true / 취소: false
//   showPrompt(message, defaultValue) → 확인: 입력값(string) / 취소: null
//   showAlert(message)                → 확인 클릭 후 resolve
//
// 사용법:
//   const { showConfirm, showPrompt, showAlert } = useModal();
//   const ok = await showConfirm('삭제하시겠습니까?');
//   if (ok) { ... }
// =====================================================

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  // 현재 표시 중인 모달 상태
  // type: 'confirm' | 'prompt' | 'alert'
  const [modal, setModal] = useState(null);

  // prompt 입력값을 ref로 관리 — 입력 중 리렌더 없이 값 추적
  const promptValueRef = useRef('');

  const closeModal = useCallback(() => setModal(null), []);

  // ── 확인/취소 다이얼로그 ──
  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({
        type: 'confirm',
        message,
        onConfirm: () => { closeModal(); resolve(true); },
        onCancel:  () => { closeModal(); resolve(false); },
      });
    });
  }, [closeModal]);

  // ── 텍스트 입력 다이얼로그 ──
  const showPrompt = useCallback((message, defaultValue = '') => {
    promptValueRef.current = defaultValue;
    return new Promise((resolve) => {
      setModal({
        type: 'prompt',
        message,
        defaultValue,
        onConfirm: () => { closeModal(); resolve(promptValueRef.current.trim() || null); },
        onCancel:  () => { closeModal(); resolve(null); },
      });
    });
  }, [closeModal]);

  // ── 알림 다이얼로그 ──
  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({
        type: 'alert',
        message,
        onClose: () => { closeModal(); resolve(); },
      });
    });
  }, [closeModal]);

  return (
    <ModalContext.Provider value={{ showConfirm, showPrompt, showAlert }}>
      {children}

      {/* 모달 오버레이 — modal 상태가 있을 때만 렌더 */}
      {modal && (
        <div
          className="app-modal-overlay"
          // 오버레이 클릭 시 취소와 동일하게 처리
          onClick={modal.type === 'alert' ? modal.onClose : modal.onCancel}
        >
          <div
            className="app-modal-box"
            onClick={(e) => e.stopPropagation()} // 박스 클릭이 오버레이로 전파되는 것 방지
          >
            {/* 메시지: 줄바꿈(\n) 지원을 위해 white-space: pre-line 적용 (CSS) */}
            <p className="app-modal-message">{modal.message}</p>

            {/* prompt 타입일 때만 입력 필드 표시 */}
            {modal.type === 'prompt' && (
              <input
                className="app-modal-input"
                type="text"
                defaultValue={modal.defaultValue}
                onChange={(e) => { promptValueRef.current = e.target.value; }}
                onKeyDown={(e) => { if (e.key === 'Enter') modal.onConfirm(); }}
                autoFocus
              />
            )}

            <div className="app-modal-actions">
              {/* alert는 확인 버튼만 */}
              {modal.type === 'alert' ? (
                <button className="app-modal-btn primary" onClick={modal.onClose}>
                  확인
                </button>
              ) : (
                <>
                  <button className="app-modal-btn secondary" onClick={modal.onCancel}>
                    취소
                  </button>
                  <button className="app-modal-btn primary" onClick={modal.onConfirm}>
                    확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

// useModal — 모달 함수를 가져오는 훅
// ModalProvider 안에서만 사용 가능
export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal은 ModalProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
