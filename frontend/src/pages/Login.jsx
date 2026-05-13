import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, FileWarning, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { login as loginApi } from '../api/client';
import './Login.css';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
  
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('아이디와 비밀번호를 입력해주세요.');
      return;
    }
  
    try {
      const { data } = await loginApi({
        username: identifier.trim(),
        password,
      });

      const token = data.access_token;
      const user = data.user;
      localStorage.setItem('auth-Storage', JSON.stringify({ state: { token, user } }));
      localStorage.setItem('userInfo', JSON.stringify({
        email: user.username,
        role: user.role,
        name: user.name,
        empId: user.username,
        department: user.department,
      }));

      navigate('/chat');
    } catch (err) {
      localStorage.removeItem('auth-Storage');
      localStorage.removeItem('userInfo');
      setErrorMsg(err.response?.data?.detail || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="auth-brand" href="#top" aria-label="SecureAI">
          <div className="auth-brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>SecureAI</strong>
            <span>Enterprise Masking Platform</span>
          </div>
        </a>
        <div className="landing-nav-actions">
          <a href="#security">보안 기능</a>
          <a href="#workflow">운영 흐름</a>
          <a className="nav-login-btn" href="#login">로그인 하러가기</a>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="auth-hero-copy">
          <span className="auth-kicker">
            <Sparkles size={15} />
            실시간 정보 유출 방지
          </span>
          <h1>
            AI 업무 대화에 들어가기 전,<br />
            민감 정보를 먼저 차단합니다.
          </h1>
          <p>
            NER 기반 탐지, 실시간 마스킹, 관리자 예외 승인, 사용자별 감사 이력을<br />
            하나의 업무용 보안 워크스페이스로 제공합니다.
          </p>
          <div className="hero-actions">
            <a className="primary-hero-btn" href="#login">
              로그인 하러가기
              <ArrowRight size={18} />
            </a>
            <a className="secondary-hero-btn" href="#security">기능 살펴보기</a>
          </div>
        </div>

        <div className="product-preview" aria-label="마스킹 플랫폼 미리보기">
          <div className="preview-topbar">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <b>Secure Workspace</b>
              <span className="active-line"></span>
              <span></span>
              <span></span>
            </div>
            <div className="preview-chat">
              <div className="risk-card">
                <FileWarning size={18} />
                <div>
                  <strong>민감정보 감지</strong>
                  <p>주민등록번호, 연락처, 내부 프로젝트명 자동 마스킹</p>
                </div>
              </div>
              <div className="message-row user">고객 김** / 연락처 010-****-****</div>
              <div className="message-row assistant">마스킹된 내용으로 안전하게 전송됩니다.</div>
              <div className="preview-composer">
                <span>응답 모델</span>
                <b>GPT</b>
                <b>Claude</b>
                <b>Gemini</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="security">
        <div className="section-heading">
          <span>Security Layer</span>
          <h2>실제 업무에 필요한 보안 흐름을 한 화면에 묶었습니다.</h2>
        </div>
        <div className="auth-proof-grid">
          <div>
            <ShieldCheck size={22} />
            <strong>Live Masking</strong>
            <span>실시간 마스킹 검증</span>
          </div>
          <div>
            <LockKeyhole size={22} />
            <strong>Exception Control</strong>
            <span>관리자 예외 승인</span>
          </div>
          <div>
            <BarChart3 size={22} />
            <strong>Audit Dashboard</strong>
            <span>사용자·부서별 이력</span>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-heading">
          <span>Workflow</span>
          <h2>대화 입력부터 예외 처리까지 끊기지 않게 이어집니다.</h2>
        </div>
        <div className="workflow-grid">
          <article>
            <b>01</b>
            <h3>입력 즉시 탐지</h3>
            <p>사용자가 입력하는 문장을 백엔드 마스킹 파이프라인으로 검증합니다.</p>
          </article>
          <article>
            <b>02</b>
            <h3>마스킹 후 표시</h3>
            <p>LLM 연동 여부와 관계없이 화면에는 마스킹된 문장이 우선 노출됩니다.</p>
          </article>
          <article>
            <b>03</b>
            <h3>예외 요청 승인</h3>
            <p>사용자는 사이드바에서 예외를 신청하고 관리자는 대시보드에서 승인합니다.</p>
          </article>
        </div>
      </section>

      <section className="login-section" id="login">
        <div className="login-section-copy">
          <span>Secure Access</span>
          <h2>승인된 계정으로 워크스페이스에 접속하세요.</h2>
          <p>관리자와 일반 사용자는 로그인 후 권한에 맞는 화면으로 자동 이동합니다.</p>
        </div>

        <div className="login-box" aria-label="로그인">
        <div className="login-card-header">
          <div className="login-icon">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h2 className="login-subtitle">계정 로그인</h2>
            <p>승인된 임직원만 접근할 수 있습니다.</p>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="login-identifier">이메일 또는 사번</label>
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="이메일 또는 사번"
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">비밀번호</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
          </div>

          {errorMsg && <p className="error-msg">{errorMsg}</p>}

          <button type="submit" className="login-btn">
            로그인
            <ArrowRight size={17} />
          </button>
        </form>

        <div className="auth-note">
          <CheckCircle2 size={16} />
          로그인 후 채팅과 관리자 대시보드가 권한에 맞게 열립니다.
        </div>

        <p className="register-link">
          계정이 없으신가요? <Link to="/register">회원가입</Link>
        </p>
        </div>
      </section>
    </main>
  );
}

export default Login;
