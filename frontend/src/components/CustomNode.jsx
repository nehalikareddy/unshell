import { Handle, Position } from '@xyflow/react';

const TAG_CONFIG = {
  LOOP:          { symbol: '↻', bg: 'rgba(255,65,54,0.2)', text: '#FF4136', title: 'Circular Loop Detected' },
  OFFSHORE:      { symbol: '⚓', bg: 'rgba(115,98,138,0.3)', text: 'var(--periwinkle)', title: 'Offshore Holding' },
  PUPPET:        { symbol: '♟', bg: 'rgba(255,184,0,0.2)', text: '#FFB800', title: 'Nominee Puppet' },
  OFAC:          { symbol: '⚠', bg: 'rgba(255,65,54,0.3)', text: '#FF4136', title: 'OFAC Sanctions Hit' },
  DEAD_END:      { symbol: '✕', bg: 'rgba(255,255,255,0.1)', text: 'var(--text-dim)', title: 'Dead End' },
  CORPORATE_PSC: { symbol: '🏛', bg: 'rgba(115,98,138,0.25)', text: 'var(--vintage-lavender)', title: 'Corporate PSC' },
  PDF_VERIFIED:  { symbol: '✓', bg: 'rgba(203,197,234,0.2)', text: 'var(--periwinkle)', title: 'PDF Verified' },
  DEPTH_2:       { symbol: '2', bg: 'rgba(115,98,138,0.3)', text: 'var(--periwinkle)', title: 'Indirect Layer 2' },
  UBO:           { symbol: '👑',bg: 'rgba(203,197,234,0.25)', text: 'var(--periwinkle)', title: 'Beneficial Owner' },
  NO_PSC:        { symbol: '?', bg: 'rgba(255,255,255,0.08)', text: 'var(--text-muted)', title: 'No PSC' },
};

function resolveTheme(data) {
  const tags = data.tags || [];
  const isTarget   = data.is_target;
  const isUbo      = tags.includes('UBO');
  const isOfac     = tags.includes('OFAC');
  const isOffshore = tags.includes('OFFSHORE');
  const isLoop     = tags.includes('LOOP');

  if (isOfac)     return { card: '#ffffff', border: '#D32F2F', accent: '#D32F2F', header: '#fde8e8', headerText: '#C53030', glow: '0 4px 16px rgba(211,47,47,0.18)' };
  if (isUbo)      return { card: '#ffffff', border: 'var(--vintage-lavender)', accent: 'var(--vintage-lavender)', header: '#ede7f6', headerText: 'var(--vintage-lavender)', glow: '0 4px 16px rgba(115,98,138,0.22)' };
  if (isLoop)     return { card: '#ffffff', border: '#E53E3E', accent: '#E53E3E', header: '#fee2e2', headerText: '#B91C1C', glow: '0 4px 14px rgba(229,62,62,0.15)' };
  if (isOffshore) return { card: '#ffffff', border: '#4A6FA5', accent: '#4A6FA5', header: '#eaf2fa', headerText: '#2D4B73', glow: '0 4px 14px rgba(74,111,165,0.15)' };
  if (isTarget)   return { card: '#ffffff', border: 'var(--twilight-indigo)', accent: 'var(--twilight-indigo)', header: '#e7ecf5', headerText: 'var(--jet-black)', glow: '0 4px 18px rgba(49,61,90,0.2)' };

  /* default light mode node */
  return { card: '#ffffff', border: 'var(--border-subtle)', accent: 'var(--vintage-lavender)', header: '#f4f3f8', headerText: 'var(--twilight-indigo)', glow: '0 2px 8px rgba(24,54,66,0.06)' };
}

function entityIcon(type, isTarget) {
  if (isTarget) return '🏢';
  if (type === 'individual' || type === 'person') return '👤';
  if (type === 'trust') return '⚖️';
  return '🏛';
}

function roleLabel(data) {
  if (data.role) return data.role.replace(/-/g, ' ');
  if (data.is_target) return 'TARGET COMPANY';
  if (data.tags?.includes('CORPORATE_PSC') || data.type === 'company') return 'CORPORATE HOLDING';
  return 'SIGNIFICANT CONTROL';
}

export default function CustomNode({ data }) {
  const theme = resolveTheme(data);

  const formatName = (str) => {
    if (!str || str.toLowerCase() === 'unknown') return 'Unknown Entity';
    const parts = str.split(', ');
    return parts.length === 2 ? `${parts[1]} ${parts[0]}` : str;
  };

  const formatPct = (p) => {
    if (!p) return null;
    if (p >= 87.0 && p <= 88.0) return '>75%';
    if (p >= 62.0 && p <= 63.0) return '50-75%';
    if (p >= 37.0 && p <= 38.0) return '25-50%';
    return `${p}%`;
  };

  const tags = data.tags || [];
  const isTarget = data.is_target;
  const isPuppet = tags.includes('NOMINEE_PUPPET');
  const isUbo    = tags.includes('UBO');

  const name = formatName(data.label || '');
  const role = roleLabel(data);
  const pct  = data.ownership_pct;
  const pctLabel = formatPct(pct);

  return (
    <div
      className="has-pin has-pin--top-left has-pin--top-right has-pin--bottom-left has-pin--bottom-right"
      style={{
        width: 260,
        background: theme.card,
        border: `1.5px solid ${theme.border}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.6), ${theme.glow}`,
        position: 'relative',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* IN handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          background: theme.accent,
          border: `2px solid ${theme.card}`,
          top: -4,
          borderRadius: 0,
        }}
      />

      {/* Header telemetry band */}
      <div
        style={{
          background: isPuppet ? '#FF4136' : theme.header,
          padding: '6px 12px',
          borderBottom: `1px solid ${isPuppet ? '#FF4136' : theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {isPuppet ? (
          <span
            style={{
              fontSize: 10,
              color: '#000',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            ♟ NOMINEE PUPPET
          </span>
        ) : isUbo ? (
          <span
            style={{
              fontSize: 10,
              color: 'var(--accent-lime)',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flex: 1,
            }}
          >
            👑 UBO CONFIRMED
          </span>
        ) : (
          <>
            <span style={{ fontSize: 11 }}>{entityIcon(data.type, isTarget)}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: theme.headerText,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
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

        {/* Tag pills */}
        {tags
          .filter(t => t !== 'UBO' && t !== 'NOMINEE_PUPPET' && TAG_CONFIG[t])
          .slice(0, 3)
          .map(t => {
            const cfg = TAG_CONFIG[t];
            return (
              <span
                key={t}
                title={cfg.title}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  background: cfg.bg,
                  color: cfg.text,
                  padding: '1px 5px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {cfg.symbol}
              </span>
            );
          })}
      </div>

      {/* Node Content */}
      <div style={{ padding: '10px 14px' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isTarget ? 13 : 12,
            fontWeight: 800,
            color: 'var(--text-white)',
            lineHeight: 1.3,
            marginBottom: 6,
            wordBreak: 'break-word',
          }}
        >
          {name}
        </div>

        {/* Ownership badge */}
        {pctLabel && pct > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              padding: '2px 6px',
              marginBottom: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>SHARES</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: theme.accent }}>
              {pctLabel}
            </span>
          </div>
        )}

        {/* Jurisdiction & date */}
        {data.jurisdiction && data.jurisdiction !== 'Unknown' && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>LOC:</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.jurisdiction}
            </span>
          </div>
        )}

        {data.appointment_date && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
            APPOINTED: {data.appointment_date}
          </div>
        )}
      </div>

      {/* OUT handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          background: theme.accent,
          border: `2px solid ${theme.card}`,
          bottom: -4,
          borderRadius: 0,
        }}
      />
    </div>
  );
}
