import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { login } from '../api/client'
import useAuthStore from '../store/authStore'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)

  const [form, setForm] = useState({
    username: 'admin',
    password: '',
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await login({
        username: form.username,
        password: form.password,
      })

      if (data.user?.role !== 'admin') {
        setError('관리자 계정만 접근할 수 있습니다.')
        return
      }

      setAuth(data.access_token, data.user)
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || '관리자 로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.grid} aria-hidden />

      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Shield size={20} color="#3B82F6" strokeWidth={2} />
          </div>
          <span style={styles.logoText}>SecureAI</span>
        </div>

        <h1 style={styles.title}>관리자 로그인</h1>
        <p style={styles.subtitle}>관리자 계정으로 대시보드에 접속합니다.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>아이디</label>
            <input
              style={styles.input}
              placeholder="관리자 아이디"
              value={form.username}
              onChange={e => update('username', e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>비밀번호</label>
            <div style={styles.pwWrap}>
              <input
                style={styles.input}
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 입력"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? '처리 중...' : '관리자 로그인'}
          </button>

          <button
            type="button"
            style={styles.backBtn}
            onClick={() => navigate('/auth')}
          >
            일반 로그인으로 돌아가기
          </button>
        </form>
      </div>
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
    color: 'var(--text-primary)',
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
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    color: 'var(--text-primary)',
    fontSize: '14px',
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
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: '2px',
    cursor: 'pointer',
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
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
