import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { login as loginApi } from '../api/client';
import './Login.css';

function LoginAccess() {
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
      sessionStorage.setItem('auth-Storage', JSON.stringify({ state: { token, user } }));
      sessionStorage.setItem('userInfo', JSON.stringify({
        email: user.username,
        role: user.role,
        name: user.name,
        empId: user.username,
        department: user.department,
      }));

      navigate('/chat');
    } catch (err) {
      sessionStorage.removeItem('auth-Storage');
      sessionStorage.removeItem('userInfo');
      setErrorMsg(err.response?.data?.detail || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <main className="access-page">
      <Link className="access-back-link" to="/">
        <ArrowLeft size={17} />
        랜딩으로 돌아가기
      </Link>

      <section className="access-card" aria-label="로그인">
        <div className="auth-brand access-brand">
          <div className="auth-brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Veil AI</strong>
            <span>Enterprise Masking Platform</span>
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

        <p className="register-link">
          계정이 없으신가요? <Link to="/register">무료 체험 신청하기</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginAccess;
