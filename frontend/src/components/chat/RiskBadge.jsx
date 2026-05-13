const RISK_CONFIG = {
  high:   { label: 'HIGH',   color: 'var(--risk-high)',   bg: 'var(--risk-high-bg)' },
  medium: { label: 'MEDIUM', color: 'var(--risk-medium)', bg: 'var(--risk-medium-bg)' },
  low:    { label: 'LOW',    color: 'var(--risk-low)',    bg: 'var(--risk-low-bg)' },
  none:   { label: 'SAFE',   color: 'var(--text-muted)',  bg: 'transparent' },
}

export default function RiskBadge({ level = 'none', size = 'sm' }) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.none
  const isLg = size === 'lg'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: isLg ? '5px 10px' : '3px 7px',
      borderRadius: '4px',
      background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      color: cfg.color,
      fontSize: isLg ? '12px' : '11px',
      fontWeight: 700,
      letterSpacing: '0.06em',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {level !== 'none' && (
        <span style={{
          width: isLg ? '6px' : '5px',
          height: isLg ? '6px' : '5px',
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }} />
      )}
      {cfg.label}
    </span>
  )
}
