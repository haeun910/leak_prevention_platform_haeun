import { useState, useEffect } from 'react';
import './ProjectModal.css';

const PRESET_COLORS = [
  '#ec1111', // 빨강
  '#ed64a6', // 분홍
  '#ed8936', // 주황
  '#e9ed0d', // 주황
  '#48bb78', // 초록
  '#05723c', // 청록
  '#4299e1', // 파랑
  '#3309db', // 파랑
  '#b40de7', // 보라
  '#6e08ad', // 자주
];

function ProjectModal({ project, onSave, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');

  // ========== 프로젝트 수정 시 기존 데이터 로드 ==========
  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setColor(project.color || PRESET_COLORS[0]);
      setDescription(project.description || '');
      setInstructions(project.instructions || '');
    }
  }, [project]);

  // ========== 폼 제출 ==========
  const handleSubmit = (e) => {
    e.preventDefault(); // 페이지 새로고침 방지
    setError(''); // 이전 에러 초기화

    // 유효성 검사
    if (!name.trim()) {
      setError('프로젝트 이름을 입력해주세요');
      return;
    }

    if (name.trim().length > 30) {
      setError('프로젝트 이름은 30자 이하로 입력해주세요');
      return;
    }

    // 부모 컴포넌트로 데이터 전달
    onSave(
      project?.id, // 수정 모드면 ID 전달, 생성 모드면 undefined
      { 
        name: name.trim(), 
        color,
        description: description.trim(),
        instructions: instructions.trim()
      }
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content project-modal" 
        onClick={(e) => e.stopPropagation()} // 모달 내부 클릭 시 닫히지 않게
      >
        <h2 className="modal-title">
          {project ? '프로젝트 수정' : '새 프로젝트'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* ========== 프로젝트 이름 ========== */}
          <div className="form-group">
            <label>프로젝트 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 마케팅 캠페인"
              autoFocus
            />
          </div>

          {/* ========== 색상 선택 ========== */}
          <div className="form-group">
            <label>색상</label>
            <div className="color-picker">
              {PRESET_COLORS.map(presetColor => (
                <button
                  key={presetColor}
                  type="button" // submit 방지
                  className={`color-option ${color === presetColor ? 'selected' : ''}`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          {/* ========== 프로젝트 설명 ========== */}
          <div className="form-group">
            <label>프로젝트 설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 프로젝트가 무엇을 다루는지 설명해주세요&#10;예: Q4 신제품 출시를 위한 마케팅 전략 수립"
              rows="3"
            />
            <div className="field-hint">
              프로젝트의 목적과 배경을 설명하면 AI가 더 적절한 답변을 제공합니다
            </div>
          </div>

          {/* ========== AI 지시사항 ========== */}
          <div className="form-group">
            <label>AI 지시사항 (선택)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="AI에게 어떻게 답변해달라고 요청할까요?&#10;예: 마케팅 전문가처럼 답변해주세요. 항상 데이터 기반으로 구체적인 전략을 제시해주세요."
              rows="4"
            />
            <div className="field-hint">
              AI의 역할, 답변 스타일, 주의사항 등을 설정할 수 있습니다
            </div>
          </div>

          {/* ========== 에러 메시지 ========== */}
          {error && <div className="error-message">{error}</div>}

          {/* ========== 버튼들 ========== */}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="save-btn">
              {project ? '저장' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectModal;