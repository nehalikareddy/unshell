import { Handle, Position } from '@xyflow/react'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert UK CH all-caps inverted name "SMITH, John" → "John Smith" */
function formatName(raw = '') {
  if (!raw) return raw
  // If ALL CAPS with comma: "FAIRFAX, Ian Gordon" → "Ian Gordon Fairfax"
  if (raw === raw.toUpperCase() && raw.includes(',')) {
    return raw.split(',')
      .map(p => p.trim())
      .reverse()
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }
  return raw
}

/** Shorten long labels safely for compact display */
function truncate(str, max = 28) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// ── Tag config ────────────────────────────────────────────────────────────────
const TAG_CONFIG = {
  LOOP:          { symbol: '↻', bg: '#FED7D7', text: '#C53030', title: 'Circular Loop' },
  OFFSHORE:      { symbol: '⚓', bg: '#BEE3F8', text: '#2B6CB0', title: 'Offshore Entity' },
  PUPPET:        { symbol: '♟', bg: '#C6F6D5', text: '#276749', title: 'Nominee Puppet' },
  OFAC:          { symbol: '⚠', bg: '#FED7D7', text: '#9B2C2C', title: 'OFAC Sanctions Match' },
  DEAD_END:      { symbol: '✕', bg: '#E2E8F0', text: '#4A5568', title: 'Dead End — No UBO' },
  CORPORATE_PSC: { symbol: '🏛', bg: '#E9D8FD', text: '#553C9A', title: 'Corporate PSC' },
  PDF_VERIFIED:  { symbol: '✓', bg: '#C6F6D5', text: '#22543D', title: 'PDF Verified' },
  DEPTH_2:       { symbol: '2', bg: '#EBF4FF', text: '#2C5282', title: 'Indirect (Depth-2)' },
  UBO:           { symbol: '👑',bg: '#FEFCBF', text: '#744210', title: 'Ultimate Beneficial Owner' },
  NO_PSC:        { symbol: '?', bg: '#F7FAFC', text: '#718096', title: 'No PSC Registered' },
}

// ── Theme resolver ────────────────────────────────────────────────────────────
function resolveTheme(data) {
  const tags = data.tags || []
  const isTarget   = data.is_target
  const isUbo      = tags.includes('UBO')
  const isOfac     = tags.includes('OFAC')
  const isOffshore = tags.includes('OFFSHORE')
  const isLoop     = tags.includes('LOOP')
  const isPdf      = tags.includes('PDF_VERIFIED')
  const isDepth2   = tags.includes('DEPTH_2')
  const isPerson   = data.type === 'individual' || data.type === 'person'

  if (isOfac)    return { card: '#fff5f5', border: '#FC8181', accent: '#C53030', header: '#FED7D7', headerText: '#9B2C2C', glow: '0 0 18px rgba(197,48,48,0.25)' }
  if (isUbo)     return { card: '#fffbeb', border: '#F6AD55', accent: '#C05621', header: '#FEFCBF', headerText: '#744210', glow: '0 0 18px rgba(240,180,41,0.35)' }
  if (isLoop)    return { card: '#fff5f5', border: '#FC8181', accent: '#C53030', header: '#FED7D7', headerText: '#9B2C2C', glow: '0 0 12px rgba(197,48,48,0.2)' }
  if (isOffshore)return { card: '#EBF8FF', border: '#63B3ED', accent: '#2B6CB0', header: '#BEE3F8', headerText: '#2B6CB0', glow: '0 0 12px rgba(49,130,206,0.2)' }
  if (isTarget)  return { card: '#EEF0FB', border: '#7C68D8', accent: '#5A4AB8', header: '#E0DCFB', headerText: '#4A3A9A', glow: '0 0 22px rgba(124,104,216,0.25)' }
  if (isPdf)     return { card: '#F0FFF4', border: '#68D391', accent: '#276749', header: '#C6F6D5', headerText: '#22543D', glow: 'none' }
  if (isDepth2)  return { card: '#EBF4FF', border: '#90CDF4', accent: '#2B6CB0', header: '#BEE3F8', headerText: '#2B6CB0', glow: 'none' }
  if (isPerson)  return { card: '#F7F8FC', border: '#C7D2FE', accent: '#4338CA', header: '#E0E7FF', headerText: '#3730A3', glow: 'none' }
  /* company */  return { card: '#F8F7FB', border: '#C4B5FD', accent: '#6D28D9', header: '#EDE9FE', headerText: '#5B21B6', glow: 'none' }
}

function entityIcon(type, isTarget) {
  if (isTarget)                              return '🏢'
  if (type === 'individual' || type === 'person') return '👤'
  if (type === 'trust')                      return '⚖️'
  return '🏛'
}

function roleLabel(data) {
  if (data.role)          return data.role.replace(/-/g, ' ')
  if (data.is_target)     return 'Target Company'
  if (data.tags?.includes('CORPORATE_PSC') || data.type === 'company') return 'Corporate PSC'
  return 'Person with Significant Control'
}

// ── Main Node Component ───────────────────────────────────────────────────────
export default function CustomNode({ data }) {
  const theme   = resolveTheme(data)
  const formatName = (str) => {
    if (!str || str.toLowerCase() === 'unknown') return 'Unknown Entity'
    const parts = str.split(', ')
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : str
  }

  const formatPct = (p) => {
    if (!p) return null
    if (p >= 87.0 && p <= 88.0) return '>75%'
    if (p >= 62.0 && p <= 63.0) return '50-75%'
    if (p >= 37.0 && p <= 38.0) return '25-50%'
    return `${p}%`
  }

  const tags = (data.tags || [])
  const isTarget = data.is_target
  const isPerson = data.type === 'individual' || data.type === 'person'
  const isPuppet = tags.includes('NOMINEE_PUPPET')
  const isUbo    = tags.includes('UBO')

  const name = formatName(data.label || '')
  const role = roleLabel(data)
  const pct  = data.ownership_pct
  const pctLabel = formatPct(pct)

  return (
    <div style={{
      width: 230,
      borderRadius: isPerson ? 24 : 12,
      background: theme.card,
      border: `1.5px solid ${theme.border}`,
      boxShadow: `0 2px 12px rgba(0,0,0,0.08), ${theme.glow}`,
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'box-shadow 0.2s',
    }}>
      {/* IN handle */}
      <Handle type="target" position={Position.Top} style={{
        width: 10, height: 10, background: theme.accent,
        border: `2px solid ${theme.card}`, top: -5,
        boxShadow: `0 0 0 1.5px ${theme.border}`,
      }} />

      {/* ── Header band ──────────────────────────────────────────────────── */}
      <div style={{
        background: isPuppet ? '#C53030' : theme.header,
        padding: isPerson ? (isUbo ? '6px 20px 4px' : '5px 20px 4px') : (isUbo ? '6px 12px 4px' : '5px 12px 4px'),
        borderBottom: `1px solid ${isPuppet ? '#9B2C2C' : theme.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
        borderRadius: isPerson ? '24px 24px 0 0' : '12px 12px 0 0',
      }}>
        {isPuppet ? (
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>
            🎭 Nominee Puppet
          </span>
        ) : isUbo ? (
          <span style={{ fontSize: 11, color: name.includes('No PSC') ? '#C53030' : '#B7791F', fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 }}>
            {name.includes('No PSC') ? '⚠️ Offshore Dead-End' : '👑 UBO Confirmed'}
          </span>
        ) : (
          <>
            <span style={{ fontSize: 13 }}>{entityIcon(data.type, isTarget)}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: theme.headerText,
              textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {role}
            </span>
          </>
        )}
        {/* Tag badges */}
        {tags.filter(t => t !== 'UBO' && t !== 'NOMINEE_PUPPET').slice(0, 3).map(t => {
          const cfg = TAG_CONFIG[t]
          return (
            <span key={t} title={cfg.title} style={{
              fontSize: 9, fontWeight: 700,
              background: cfg.bg, color: cfg.text,
              borderRadius: 4, padding: '1px 5px',
              flexShrink: 0,
            }}>{cfg.symbol}</span>
          )
        })}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: isPerson ? '8px 20px 10px' : '8px 12px 10px' }}>
        {/* Full name — up to 2 lines */}
        <div style={{
          fontSize: isTarget ? 13 : 12,
          fontWeight: isTarget ? 800 : 700,
          color: '#1A1729',
          lineHeight: 1.3,
          marginBottom: 4,
          paddingLeft: 2, paddingRight: 2, marginLeft: -2, marginRight: -2,
          overflowWrap: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          borderRadius: isPerson ? '0 0 24px 24px' : 0,
        }}>
          {name}
        </div>

        {/* Ownership % pill */}
        {pctLabel && pct > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: theme.accent + '15',
            border: `1px solid ${theme.accent}40`,
            borderRadius: 999,
            padding: '2px 8px', marginBottom: 4,
          }}>
            <span style={{ fontSize: 9, color: theme.accent, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shares</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: theme.accent }}>
              {pctLabel}
            </span>
          </div>
        )}

        {/* Jurisdiction */}
        {data.jurisdiction && data.jurisdiction !== 'Unknown' && (
          <div style={{
            fontSize: 9, color: '#8C8070', fontWeight: 500,
            letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>📍</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.jurisdiction}
            </span>
          </div>
        )}

        {/* Appointment date for officers */}
        {data.appointment_date && (
          <div style={{ fontSize: 9, color: '#A09580', marginTop: 2 }}>
            Appointed: {data.appointment_date}
          </div>
        )}
      </div>

      {/* OUT handle */}
      <Handle type="source" position={Position.Bottom} style={{
        width: 10, height: 10, background: theme.accent,
        border: `2px solid ${theme.card}`, bottom: -5,
        boxShadow: `0 0 0 1.5px ${theme.border}`,
      }} />
    </div>
  )
}
