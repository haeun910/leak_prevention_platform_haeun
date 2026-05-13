import { useState } from 'react'
import { Plus, ChevronRight, ChevronDown, MessageSquare,
         FolderOpen, Folder, Trash2, Shield } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function Sidebar({ conversations, currentId, onSelect, onCreate, onDelete, projects, onCreateProject }) {
  const user = useAuthStore(s => s.user)
  const [openProjects, setOpenProjects] = useState({})

  const toggleProject = (id) => setOpenProjects(p => ({ ...p, [id]: !p[id] }))

  const ungrouped = conversations.filter(c => !c.projectId)
  const grouped = projects.map(p => ({
    ...p,
    items: conversations.filter(c => c.projectId === p.id),
  }))

  return (
    <aside style={styles.sidebar}>
      {/* 로고 */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <Shield size={16} color="var(--accent)" />
          <span style={styles.logoText}>SecureAI</span>
        </div>
        {user?.department && (
          <span style={styles.dept}>{user.department}</span>
        )}
      </div>

      {/* 새 대화 */}
      <button style={styles.newBtn} onClick={onCreate}>
        <Plus size={14} />
        새 대화
      </button>

      <div style={styles.scroll}>
        {/* 프로젝트 폴더 */}
        {grouped.map(proj => (
          <div key={proj.id} style={styles.section}>
            <button style={styles.projectRow} onClick={() => toggleProject(proj.id)}>
              {openProjects[proj.id]
                ? <FolderOpen size={13} color="var(--accent)" />
                : <Folder size={13} color="var(--text-muted)" />
              }
              <span style={styles.projectName}>{proj.name}</span>
              <span style={styles.projectCount}>{proj.items.length}</span>
              {openProjects[proj.id]
                ? <ChevronDown size={12} color="var(--text-muted)" />
                : <ChevronRight size={12} color="var(--text-muted)" />
              }
            </button>
            {openProjects[proj.id] && proj.items.map(c => (
              <ConvItem key={c.id} conv={c} active={c.id === currentId}
                onSelect={onSelect} onDelete={onDelete} indent />
            ))}
          </div>
        ))}

        {/* 미분류 대화 */}
        {ungrouped.length > 0 && (
          <div style={styles.section}>
            {grouped.length > 0 && (
              <p style={styles.sectionLabel}>기타</p>
            )}
            {ungrouped.map(c => (
              <ConvItem key={c.id} conv={c} active={c.id === currentId}
                onSelect={onSelect} onDelete={onDelete} />
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {conversations.length === 0 && (
          <p style={styles.empty}>대화 내역이 없습니다.</p>
        )}
      </div>

      {/* 하단: 새 프로젝트 */}
      <button style={styles.newProjectBtn} onClick={onCreateProject}>
        <FolderOpen size={13} />
        새 프로젝트 폴더
      </button>
    </aside>
  )
}

function ConvItem({ conv, active, onSelect, onDelete, indent }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      style={{
        ...styles.convItem,
        paddingLeft: indent ? '28px' : '12px',
        background: active ? 'var(--bg-active)' : hover ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(conv.id)}
    >
      <MessageSquare size={13} style={{ flexShrink: 0 }} />
      <span style={styles.convTitle}>{conv.title || '새 대화'}</span>
      {(hover || active) && (
        <button
          style={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
          title="삭제"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    height: '100%',
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    padding: '16px 14px 12px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  dept: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
  },
  newBtn: {
    margin: '10px 10px 6px',
    padding: '9px 12px',
    background: 'var(--accent-subtle)',
    color: 'var(--accent)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    transition: 'background var(--transition)',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  section: {
    marginBottom: '4px',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '8px 14px 4px',
  },
  projectRow: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '7px 12px',
    background: 'none',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'background var(--transition)',
    borderRadius: '0',
  },
  projectName: {
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  projectCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    padding: '1px 6px',
    borderRadius: '10px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)',
    margin: '1px 6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background var(--transition)',
    userSelect: 'none',
  },
  convTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    background: 'none',
    color: 'var(--text-muted)',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '3px',
    flexShrink: 0,
  },
  empty: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '24px 16px',
  },
  newProjectBtn: {
    margin: '6px 10px 10px',
    padding: '8px 12px',
    background: 'none',
    color: 'var(--text-muted)',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    transition: 'border-color var(--transition)',
  },
}
