export default function StatsCard({ label, value, sub, color }) {
  return (
    <div style={{ ...styles.card, borderColor: color ? `${color}30` : 'var(--border)' }}>
      <p style={styles.label}>{label}</p>
      <p style={{ ...styles.value, color: color || 'var(--text-primary)' }}>
        {value ?? '-'}
      </p>
      {sub && <p style={styles.sub}>{sub}</p>}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-elevated)',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: '30px',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: 1,
  },
  sub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
}
