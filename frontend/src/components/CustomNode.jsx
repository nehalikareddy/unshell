import { Handle, Position } from '@xyflow/react'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert UK CH all-caps inverted name "SMITH, John" → "John Smith" */
function formatName(raw = '') {
  if (!raw || raw.toLowerCase() === 'unknown') return 'Unknown Entity'
  if (raw.includes(',')) {
    return raw
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .reverse()
      .map(part =>
        part
          .split(/\s+/)
          .map(word =>
            word === word.toUpperCase() && word.length > 1
              ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              : word
          )
          .join(' ')
      )
      .join(' ')
  }
  return raw
}

// ── Tag config ────────────────────────────────────────────────────────────────
const TAG_CONFIG = {
  LOOP:           { symbol: '↻', bg: '#FED7D7', text: '#C53030', title: 'Circular Loop' },
  OFFSHORE:       { symbol: '⚓', bg: '#BEE3F8', text: '#2B6CB0', title: 'Offshore Entity' },
  PUPPET:         { symbol: '♟', bg: '#C6F6D5', text: '#276749', title: 'Nominee Puppet' },
  NOMINEE_PUPPET: { symbol: '♟', bg: '#C6F6D5', text: '#276749', title: 'Nominee Puppet' },
  OFAC:           { symbol: '⚠', bg: '#FED7D7', text: '#9B2C2C', title: 'OFAC Sanctions Match' },
  DEAD_END:       { symbol: '✕', bg: '#E2E8F0', text: '#4A5568', title: 'Dead End — No UBO' },
  CORPORATE_PSC:  { symbol: '🏛', bg: '#E9D8FD', text: '#553C9A', title: 'Corporate PSC' },
  PDF_VERIFIED:   { symbol: '✓', bg: '#C6F6D5', text: '#22543D', title: 'PDF Verified' },
  DEPTH_2:        { symbol: 'L2', bg: '#EBF4FF', text: '#2C5282', title: 'Indirect (Depth-2)' },
  UBO:            { symbol: '👑', bg: '#FEFCBF', text: '#744210', title: 'Ultimate Beneficial Owner' },
  NO_PSC:         { symbol: '?', bg: '#F7FAFC', text: '#718096', title: 'No PSC Registered' },
}

// ── Theme resolver ────────────────────────────────────────────────────────────
function resolveTheme(data) {
  const tags       = data.tags || []
  const isTarget   = data.is_target
  const isUbo      = tags.includes('UBO')
  const isOfac     = tags.includes('OFAC')
  const isOffshore = tags.includes('OFFSHORE')
  const isLoop     = tags.includes('LOOP')
  const isPdf      = tags.includes('PDF_VERIFIED')
  const isDepth2   = tags.includes('DEPTH_2')
  const isPerson   = data.type === 'individual' || data.type === 'person'

  if (isOfac)     return { card: '#fff5f5', border: '#FC8181', accent: '#C53030', header: '#FED7D7', headerText: '#9B2C2C', glow: '0 4px 18px rgba(197,48,48,0.22)' }
  if (isUbo)      return { card: '#fffbeb', border: '#F6AD55', accent: '#C05621', header: '#FEFCBF', headerText: '#744210', glow: '0 4px 18px rgba(240,180,41,0.30)' }
  if (isLoop)     return { card: '#fff5f5', border: '#FC8181', accent: '#C53030', header: '#FED7D7', headerText: '#9B2C2C', glow: '0 4px 14px rgba(197,48,48,0.18)' }
  if (isOffshore) return { card: '#EBF8FF', border: '#63B3ED', accent: '#2B6CB0', header: '#BEE3F8', headerText: '#2B6CB0', glow: '0 4px 14px rgba(49,130,206,0.18)' }
  if (isTarget)   return { card: '#EEF0FB', border: '#7C68D8', accent: '#5A4AB8', header: '#E0DCFB', headerText: '#4A3A9A', glow: '0 6px 24px rgba(124,104,216,0.28)' }
  if (isPdf)      return { card: '#F0FFF4', border: '#68D391', accent: '#276749', header: '#C6F6D5', headerText: '#22543D', glow: 'none' }
  if (isDepth2)   return { card: '#F0F7FF', border: '#90CDF4', accent: '#2B6CB0', header: '#DBEAFE', headerText: '#1E40AF', glow: 'none' }
  if (isPerson)   return { card: '#FFFFFF', border: '#CBD5E1', accent: '#475569', header: '#F1F5F9', headerText: '#334155', glow: 'none' }
  /* company */   return { card: '#FAF8FF', border: '#C4B5FD', accent: '#6D28D9', header: '#EDE9FE', headerText: '#5B21B6', glow: 'none' }
}

function entityIcon(type, isTarget) {
  if (isTarget)                                   return '🏢'
  if (type === 'individual' || type === 'person') return '👤'
  if (type === 'trust')                           return '⚖️'
  return '🏛'
}

function roleLabel(data) {
  if (data.is_target) return 'Target Company'
  if (data.role)      return data.role.replace(/-/g, ' ')
  if (data.tags?.includes('CORPORATE_PSC') || data.type === 'company') return 'Corporate PSC'
  return 'Beneficial Owner (PSC)'
}

// ── Main Node Component ───────────────────────────────────────────────────────
export default function CustomNode({ data }) {
  const theme = resolveTheme(data)

  const formatPct = (p) => {
    if (!p) return null
    if (p >= 87.0 && p <= 88.0) return '>75%'
    if (p >= 62.0 && p <= 63.0) return '50–75%'
    if (p >= 37.0 && p <= 38.0) return '25–50%'
    return `${p}%`
  }

  const tags     = data.tags || []
  const isTarget = data.is_target
  const isPerson = data.type === 'individual' || data.type === 'person'
  const isPuppet = tags.includes('NOMINEE_PUPPET') || tags.includes('PUPPET')
  const isUbo    = tags.includes('UBO')
  const isLR     = data.layoutDir === 'LR'

  const name     = formatName(data.label || '')
  const role     = roleLabel(data)
  const pct      = data.ownership_pct
  const pctLabel = formatPct(pct)

  const handleStyle = {
    width: 8,
    height: 8,
    background: theme.accent,
    border: `2px solid ${theme.card}`,
    boxShadow: `0 0 0 1px ${theme.border}`,
  }

  return (
    <div
      style={{
        width: 240,
        borderRadius: isTarget ? 14 : isPerson ? 18 : 12,
        background: theme.card,
        border: `${isTarget ? '2px' : '1.5px'} solid ${theme.border}`,
        boxShadow: `0 2px 10px rgba(0,0,0,0.06)${theme.glow !== 'none' ? `, ${theme.glow}` : ''}`,
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
        cursor: 'grab',
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}
    >
      {/* Top / Left handles (used for incoming ownership chains or upward officer links) */}
      <Handle
        id="top-target"
        type="target"
        position={isLR ? Position.Left : Position.Top}
        style={handleStyle}
      />
      <Handle
        id="top-source"
        type="source"
        position={isLR ? Position.Left : Position.Top}
        style={handleStyle}
      />

      {/* ── Header band ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: isPuppet ? '#C53030' : theme.header,
          padding: '5px 12px',
          borderBottom: `1px solid ${isPuppet ? '#9B2C2C' : theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {isPuppet ? (
          <span
            style={{
              fontSize: 10,
              color: '#fff',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            🎭 Nominee Puppet
          </span>
        ) : isUbo ? (
          <span
            style={{
              fontSize: 10,
              color: name.includes('No PSC') ? '#C53030' : '#975A16',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            {name.includes('No PSC') ? '⚠️ Offshore Dead-End' : '👑 UBO Confirmed'}
          </span>
        ) : (
          <>
            <span style={{ fontSize: 12 }}>{entityIcon(data.type, isTarget)}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: theme.headerText,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {role}
            </span>
          </>
        )}

        {/* Tag badges */}
        {tags
          .filter(t => t !== 'UBO' && t !== 'NOMINEE_PUPPET' && t !== 'PUPPET' && TAG_CONFIG[t])
          .slice(0, 3)
          .map(t => {
            const cfg = TAG_CONFIG[t]
            return (
              <span
                key={t}
                title={cfg.title}
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  background: cfg.bg,
                  color: cfg.text,
                  borderRadius: 4,
                  padding: '1px 5px',
                  flexShrink: 0,
                }}
              >
                {cfg.symbol}
              </span>
            )
          })}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '9px 12px 10px' }}>
        <div
          style={{
            fontSize: isTarget ? 12.5 : 11.5,
            fontWeight: isTarget ? 800 : 700,
            color: '#1A1729',
            lineHeight: 1.32,
            marginBottom: 5,
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          {name}
        </div>

        {/* Metadata row: Ownership % pill + Jurisdiction */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          {pctLabel && pct > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: `${theme.accent}15`,
                border: `1px solid ${theme.accent}40`,
                borderRadius: 999,
                padding: '1px 7px',
              }}
            >
              <span
                style={{
                  fontSize: 8.5,
                  color: theme.accent,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Shares
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: theme.accent }}>
                {pctLabel}
              </span>
            </div>
          )}

          {data.jurisdiction && data.jurisdiction !== 'Unknown' && (
            <div
              style={{
                fontSize: 9.5,
                color: '#6E665E',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                maxWidth: '100%',
              }}
            >
              <span>📍</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {data.jurisdiction}
              </span>
            </div>
          )}
        </div>

        {/* Appointment date for officers */}
        {data.appointment_date && (
          <div style={{ fontSize: 9, color: '#948B7E', marginTop: 4 }}>
            Appointed: {data.appointment_date}
          </div>
        )}
      </div>

      {/* Bottom / Right handles */}
      <Handle
        id="bottom-source"
        type="source"
        position={isLR ? Position.Right : Position.Bottom}
        style={handleStyle}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={isLR ? Position.Right : Position.Bottom}
        style={handleStyle}
      />
    </div>
  )
}
