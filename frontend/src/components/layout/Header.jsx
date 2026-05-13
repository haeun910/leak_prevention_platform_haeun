import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, LayoutDashboard, User } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Header({ title }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <header style={styles.header}>
      <h2 style={styles.title}>{title || '새 대화'}</h2>

      <div style={styles.right}>
        {/* 유저 메뉴 */}
        <div style={{ position: 'relative' }}>
          <button style={styles.userBtn} onClick={() => setMenuOpen(v => !v)}>
            <div style={styles.avatar}>
              {user?.name?.[0] ?? 'U'}
            </div>
            <div style={styles.userInfo}>
              <span style={styles.userName}>{user?.name}</span>
              <span style={styles.userDept}>{user?.department}</span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {menuOpen && (
            <>
              <div style={styles.overlay} onClick={() => setMenuOpen(false)} />
              <div style={styles.menu}>
                <div style={styles.menuHeader}>
                  <span style={styles.menuName}>{user?.name}</span>
                  <span style={styles.menuUsername}>@{user?.username}</span>
                </div>
                <div style={styles.menuDivider} />
                {user?.role === 'admin' && (
                  <button style={styles.menuItem} onClick={() => { navigate('/admin'); setMenuOpen(false) }}>
                    <LayoutDashboard size={14} />
                    관리자 대시보드
                  </button>
                )}
                <button style={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  <User size={14} />
                  내 정보
                </button>
                <div style={styles.menuDivider} />
                <button style={{ ...styles.menuItem, color: 'var(--risk-high)' }} onClick={handleLogout}>
                  <LogOut size={14} />
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

const styles = {
  header: {
    height: 'var(--header-h)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '5px 10px 5px 5px',
    background: 'none',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    transition: 'background var(--transition)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1,
  },
  userDept: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10,
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    right: 0,
    width: '200px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '6px',
    zIndex: 11,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  menuHeader: {
    padding: '8px 10px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuName: {
    fontSize: '14px',
    fontWeight: 600,
  },
  menuUsername: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  menuDivider: {
    height: '1px',
    background: 'var(--border)',
    margin: '4px 0',
  },
  menuItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '8px 10px',
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    borderRadius: '6px',
    transition: 'background var(--transition)',
    textAlign: 'left',
  },
}
