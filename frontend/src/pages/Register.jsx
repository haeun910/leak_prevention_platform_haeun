import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
import { useModal } from '../components/AppModal';
import { getDepartments, register as registerApi } from '../api/client';
import './Login.css';

function Register() {
  const { showAlert } = useModal();
  const [form, setForm] = useState({
    name: '',
    empId: '',
    email: '',
    department: '', // 부서 추가
    password: '',
    confirmPassword: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getDepartments()
      .then(({ data }) => setDepartments(data.departments || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. 필수 입력 체크
    if (!form.name.trim() || !form.email.trim() || !form.department || !form.password.trim()) {
      setErrorMsg('이름, 이메일, 부서, 비밀번호는 필수 입력입니다.');
      return;
    }

    // 2. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErrorMsg('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 3. 비밀번호 확인
    if (form.password !== form.confirmPassword) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 4. 비밀번호 길이
    if (form.password.length < 4) {
      setErrorMsg('비밀번호는 4자 이상 입력해주세요.');
      return;
    }

    // 5. 사번 형식 검증 (입력한 경우에만)
    if (form.empId.trim()) {
      const empIdRegex = /^\d{6}$/;
      if (!empIdRegex.test(form.empId)) {
        setErrorMsg('사번은 6자리 숫자로 입력해주세요.');
        return;
      }
    }

    try {
      const { data } = await registerApi({
        username: form.email.toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        department: form.department,
      });

      const token = data.access_token;
      const user = data.user;
      sessionStorage.setItem('auth-Storage', JSON.stringify({ state: { token, user } }));
      sessionStorage.setItem('userInfo', JSON.stringify({
        email: user.username,
        role: user.role,
        name: user.name,
        empId: form.empId.trim() || user.username,
        department: user.department,
      }));

      await showAlert('회원가입이 완료되었습니다.');
      navigate('/chat');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || '회원가입에 실패했습니다.');
    }
  };

  return (
    <main className="login-container">
      <section className="auth-hero-panel">
        <nav className="auth-brand">
          <div className="auth-brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>Veil AI</strong>
            <span>Enterprise Masking Platform</span>
          </div>
        </nav>

        <div className="auth-hero-copy">
          <span className="auth-kicker">신규 사용자 등록</span>
          <h1>사내 보안 정책에 맞춰 안전하게 시작하세요.</h1>
          <p>
            가입 후 승인 상태와 권한에 따라 채팅 워크스페이스와 관리자 기능이 분리되어 제공됩니다.
          </p>
        </div>

        <div className="auth-proof-grid">
          <div>
            <strong>Policy</strong>
            <span>부서 기반 관리</span>
          </div>
          <div>
            <strong>Masking</strong>
            <span>민감정보 보호</span>
          </div>
          <div>
            <strong>Trace</strong>
            <span>활동 이력 기록</span>
          </div>
        </div>
      </section>

      <section className="login-box register-box" aria-label="회원가입">
        <div className="login-card-header">
          <div className="login-icon">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="login-subtitle">회원가입</h2>
            <p>업무 계정 정보를 입력해 주세요.</p>
          </div>
        </div>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="register-name">이름</label>
            <input
              id="register-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="이름 (필수)"
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-emp-id">사번</label>
            <input
              id="register-emp-id"
              type="text"
              name="empId"
              value={form.empId}
              onChange={handleChange}
              placeholder="사번 (선택, 6자리 숫자)"
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-email">이메일</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="이메일 (필수)"
            />
          </div>

          {/* 부서 선택 드롭다운 */}
          <div className="input-group">
            <label htmlFor="register-department">부서</label>
            <select
              id="register-department"
              name="department"
              value={form.department}
              onChange={handleChange}
              className="department-select"
            >
              <option value="">부서 선택 (필수)</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="register-password">비밀번호</label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="비밀번호 (필수, 4자 이상)"
            />
          </div>

          <div className="input-group">
            <label htmlFor="register-confirm-password">비밀번호 확인</label>
            <input
              id="register-confirm-password"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="비밀번호 확인"
            />
          </div>

          {errorMsg && <p className="error-msg">{errorMsg}</p>}

          <button type="submit" className="login-btn">
            회원가입
            <ArrowRight size={17} />
          </button>
        </form>

        <p className="register-link">
          이미 계정이 있으신가요? <Link to="/">로그인</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
