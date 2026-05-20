import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { login, register, getDepartments } from '../api/client'
import useAuthStore from '../store/authStore'

export default function AuthPage() {
  console.log('AuthPage 화면 실행됨')
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const token = useAuthStore(s => s.token)

  const [mode, setMode] = useState('login') // login | register
  const [departments, setDepartments] = useState([])
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    username: '', password: '', passwordConfirm: '',
    name: '', department: '',
  })

  useEffect(() => {
    getDepartments().then(r => setDepartments(r.data.departments)).catch(() => {})
  }, [])

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setError('')
  }

  const pwMatch = form.password === form.passwordConfirm

  const handleSubmit = async (e) => {
    console.log('🔥 로그인 버튼 눌림')
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (!pwMatch) return setError('비밀번호가 일치하지 않습니다.')
      if (!form.department) return setError('부서를 선택해 주세요.')
      if (form.password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.')
    }

    setLoading(true)
    try {
      const fn = mode === 'login' ? login : register
      const payload = mode === 'login'
        ? { username: form.username, password: form.password }
        : { username: form.username, password: form.password, name: form.name, department: form.department }

      if (mode === 'login' && form.username.trim() === 'admin') {
        setError('관리자는 관리자 로그인 페이지를 이용해 주세요.')
        return
      }

      const { data } = await fn(payload)

      if (
        mode === 'login' &&
        (
          data.user?.role === 'admin' ||
          data.role === 'admin' ||
          data.user?.username === 'admin'
        )
      ) {
        setError('관리자는 관리자 로그인 페이지를 이용해 주세요.')
        return
      }

      setAuth(data.access_token, data.user)
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || '오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* 배경 그리드 */}
      <div style={styles.grid} aria-hidden />

      <div style={styles.card}>
        {/* 로고 */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Shield size={20} color="#3B82F6" strokeWidth={2} />
          </div>
          <span style={styles.logoText}>SecureAI</span>
        </div>

        <h1 style={styles.title}>
          {mode === 'login' ? '로그인' : '계정 만들기'}
        </h1>
        <p style={styles.subtitle}>
          {mode === 'login'
            ? '기업 AI 플랫폼에 오신 것을 환영합니다.'
            : '새 계정을 만들어 시작하세요.'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <Field label="이름">
              <input
                style={styles.input}
                placeholder="홍길동"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="아이디">
            <input
              style={styles.input}
              placeholder="아이디 입력"
              value={form.username}
              onChange={e => update('username', e.target.value)}
              autoComplete="username"
              required
            />
          </Field>

          {mode === 'register' && (
            <Field label="부서">
              <div style={styles.selectWrap}>
                <select
                  style={styles.select}
                  value={form.department}
                  onChange={e => update('department', e.target.value)}
                  required
                >
                  <option value="">부서 선택</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={14} color="var(--text-muted)" style={styles.selectIcon} />
              </div>
            </Field>
          )}

          <Field label="비밀번호">
            <div style={styles.pwWrap}>
              <input
                style={styles.input}
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 입력"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          {mode === 'register' && (
            <Field
              label="비밀번호 확인"
              hint={form.passwordConfirm.length > 0
                ? pwMatch ? '일치합니다.' : '비밀번호가 일치하지 않습니다.'
                : ''}
              hintOk={pwMatch}
            >
              <div style={styles.pwWrap}>
                <input
                  style={{
                    ...styles.input,
                    borderColor: form.passwordConfirm.length > 0
                      ? pwMatch ? 'var(--risk-low)' : 'var(--risk-high)'
                      : undefined,
                  }}
                  type={showPwConfirm ? 'text' : 'password'}
                  placeholder="비밀번호 재입력"
                  value={form.passwordConfirm}
                  onChange={e => update('passwordConfirm', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPwConfirm(v => !v)}>
                  {showPwConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <p style={styles.switchText}>
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <button
            type="button"
            style={styles.switchBtn}
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ label, hint, hintOk, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: '12px', color: hintOk ? 'var(--risk-low)' : 'var(--risk-high)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(var(--border-subtle) 1px, transparent 1px),
      linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    position: 'relative',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    background: 'var(--accent-subtle)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    transition: 'border-color var(--transition)',
  },
  pwWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
  },
  selectWrap: {
    position: 'relative',
  },
  select: {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    appearance: 'none',
    cursor: 'pointer',
  },
  selectIcon: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  error: {
    fontSize: '13px',
    color: 'var(--risk-high)',
    background: 'var(--risk-high-bg)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  submitBtn: {
    marginTop: '4px',
    padding: '12px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'background var(--transition)',
    letterSpacing: '-0.01em',
  },
  switchText: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  switchBtn: {
    background: 'none',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
    marginLeft: '6px',
    padding: 0,
  },
}
