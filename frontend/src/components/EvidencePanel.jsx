const TAG_META = {
  LOOP:     { bg: 'rgba(197,48,48,0.15)',   text: '#FC8181', border: 'rgba(197,48,48,0.35)',   label: 'Circular Loop' },
  OFFSHORE: { bg: 'rgba(29,78,216,0.15)',   text: '#93C5FD', border: 'rgba(29,78,216,0.35)',   label: 'Offshore Entity' },
  PUPPET:   { bg: 'rgba(194,65,12,0.15)',   text: '#FDBA74', border: 'rgba(194,65,12,0.35)',   label: 'Nominee Puppet' },
  OFAC:     { bg: 'rgba(127,0,0,0.25)',     text: '#FCA5A5', border: 'rgba(197,48,48,0.4)',    label: 'OFAC Match' },
  DEAD_END: { bg: 'rgba(50,15,15,0.3)',     text: '#F87171', border: 'rgba(127,29,29,0.4)',    label: 'Dead-End' },
}

const TRUST_MAP = {
  1.0: { label: 'API Verified',  color: '#34D399', bg: 'rgba(4,120,87,0.15)',   border: 'rgba(4,120,87,0.35)' },
  0.4: { label: 'AI Extracted',  color: '#FB923C', bg: 'rgba(194,65,12,0.15)',  border: 'rgba(194,65,12,0.35)' },
  0.0: { label: 'Unverified',    color: '#FC8181', bg: 'rgba(127,0,0,0.2)',     border: 'rgba(197,48,48,0.35)' },
}

function getTrust(score) {
  return TRUST_MAP[score] ?? TRUST_MAP[0.0]
}

function renderHighlighted(text) {
  if (!text) return <span style={{ color: '#4A4238', fontStyle: 'italic' }}>No evidence snippet available.</span>
  return text.split(/(\d+(?:\.\d+)?%)/).map((part, i) =>
    /\d+(?:\.\d+)?%/.test(part)
      ? <span key={i} style={{ background: 'rgba(251,146,60,0.15)', color: '#FDBA74', borderRadius: 4, padding: '0 4px', fontWeight: 600 }}>{part}</span>
      : <span key={i}>{part}</span>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--border-light)',
      borderRadius: 12,
      padding: '10px 12px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function StatBox({ label, value, valueColor }) {
  return (
    <Card style={{ textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: valueColor || 'var(--text-dark)', fontSize: 14, fontWeight: 700 }}>{value ?? '—'}</div>
    </Card>
  )
}

export default function EvidencePanel({ edge, nodes, onClose, stats }) {
  if (!edge) return null

  const sourceNode = nodes.find(n => n.id === edge.source)
  const targetNode = nodes.find(n => n.id === edge.target)
  const trust = getTrust(edge.trust_score)
  const nodeTags = (sourceNode?.tags || []).filter(t => TAG_META[t])

  return (
    <div className="fade-in" style={{
      width: '100%', height: '100%',
      background: 'var(--cream-2)',
      borderLeft: '1px solid var(--border-light)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
        background: 'var(--white)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'var(--text-dark)', fontSize: 13, fontWeight: 600, letterSpacing: '0.01em', marginBottom: 4 }}>
              Evidence Provenance
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--text-mid)', fontSize: 11 }}>{sourceNode?.label || edge.source}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→</span>
              <span style={{ color: 'var(--text-mid)', fontSize: 11 }}>{targetNode?.label || edge.target}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--cream)', border: '1px solid var(--border-light)',
            color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-dark)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.boxShadow = 'none' }}
          >×</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          <StatBox 
            label={edge.ownership_pct != null ? "Ownership" : "Role"} 
            value={edge.ownership_pct != null ? `${edge.ownership_pct}%` : edge.label || '—'} 
          />
          <Card style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Trust Level</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              background: trust.bg, border: `1px solid ${trust.border}`,
              color: trust.color, fontSize: 10, fontWeight: 600,
              padding: '2px 9px', borderRadius: 9999,
            }}>
              {trust.label}
            </div>
          </Card>
          <Card style={{ gridColumn: '1/-1' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Source Document</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dark)', fontSize: 11, fontWeight: 500, flex: 1, marginRight: 8 }}>{edge.source_doc || '—'}</span>
              {edge.source_page && (
                <span style={{ color: 'var(--text-mid)', fontSize: 10, background: 'var(--cream)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '1px 7px' }}>
                  p.{edge.source_page}
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Risk flags */}
        {nodeTags.length > 0 && (
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Risk Flags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {nodeTags.map(tag => {
                const m = TAG_META[tag]
                return (
                  <span key={tag} style={{
                    background: m.bg, color: m.text,
                    border: `1px solid ${m.border}`,
                    fontSize: 10, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 9999,
                  }}>{m.label}</span>
                )
              })}
            </div>
          </div>
        )}

        {/* Evidence document */}
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--green)' }}>✓</span> Exact Data Provenance
          </div>
          <div style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: 'var(--white)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Source Filing</span>
                {edge.source_page && <span style={{ color: '#C05621', fontSize: 10, fontWeight: 700, background: 'rgba(232,168,72,0.1)', padding: '2px 6px', borderRadius: 4 }}>Page {edge.source_page}</span>}
              </div>
              <div style={{ color: 'var(--text-dark)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                📄 {edge.source_doc || 'API Sync'}
              </div>
            </div>
            <div style={{ padding: '14px', background: 'var(--cream)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 6 }}>Verbatim Snippet</div>
              <p style={{ 
                color: 'var(--text-dark)', fontSize: 12, lineHeight: 1.75, margin: 0,
                borderLeft: '2px solid var(--border-dark)', paddingLeft: 10, fontStyle: 'italic'
              }}>
                "{renderHighlighted(edge.evidence_snippet)}"
              </p>
            </div>
          </div>
        </div>

        {/* Investigation summary */}
        {stats && (
          <div>
            <div style={{ color: '#625C52', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>Investigation Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <StatBox label="Loops" value={stats.loops_detected} valueColor={stats.loops_detected > 0 ? '#FC8181' : undefined} />
              <StatBox label="Puppets" value={stats.puppets_detected} valueColor={stats.puppets_detected > 0 ? '#FDBA74' : undefined} />
              <StatBox label="Jurisdictions" value={stats.jurisdictions} />
              <StatBox label="Depth" value={stats.investigation_depth} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
