const RISK_BANNER = {
  CRITICAL:     { bg: 'rgba(255, 65, 54, 0.08)', border: 'var(--accent-red)',   text: 'var(--accent-red)' },
  HIGH_RISK:    { bg: 'rgba(255, 100, 54, 0.08)', border: '#FF6436',            text: '#FF6436' },
  MEDIUM_RISK:  { bg: 'rgba(255, 179, 0, 0.08)', border: 'var(--accent-amber)', text: 'var(--accent-amber)' },
  AUTO_APPROVE: { bg: 'rgba(192, 254, 4, 0.08)', border: 'var(--accent-lime)',  text: 'var(--accent-lime)' },
};

export default function RiskScoreboard({
  riskScore,
  riskLabel,
  fatalFlags = [],
  cumulativeVectors = [],
  sanctionsHit,
  sanctionsDetail,
  resolvedUbo,
  compact = false,
}) {
  const banner = RISK_BANNER[riskLabel] || RISK_BANNER.MEDIUM_RISK;

  /* ── COMPACT (top bar) ─────────────────────────────────────────────────── */
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: banner.text, fontSize: 18, fontWeight: 800 }}>{riskScore ?? '--'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/100</span>
        </div>

        <span
          className="telemetry-tag"
          style={{
            background: banner.bg,
            color: banner.text,
            borderColor: banner.border,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {riskLabel ? riskLabel.replace(/_/g, ' ') : 'PENDING'}
        </span>

        {resolvedUbo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderLeft: '1px solid var(--border-hairline)',
              paddingLeft: 10,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>UBO:</span>
            <span
              style={{
                color: sanctionsHit ? 'var(--accent-red)' : 'var(--text-light)',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {sanctionsHit && '⚠ '}{resolvedUbo}
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ── FULL VERSION (bottom telemetry bar) ──────────────────────────────── */
  return (
    <div
      className="risk-scoreboard-bottom"
      style={{
        borderLeft: `4px solid ${banner.border}`,
      }}
    >
      {/* S1: Score telemetry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          RISK_SCORE
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: banner.text, fontSize: 20, fontWeight: 900 }}>{riskScore ?? '--'}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>/ 100</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: banner.text,
              marginLeft: 4,
            }}
          >
            [{riskLabel?.replace(/_/g, ' ') || 'ANALYZED'}]
          </span>
        </div>
      </div>

      <div className="risk-divider" style={{ width: 1, height: 32, background: 'var(--border-hairline)', flexShrink: 0 }} />

      {/* S2: Flags / Detected Risk Vectors */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 140 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          EVIDENCE_VECTORS
        </span>
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          {fatalFlags.map(f => (
            <span
              key={f}
              className="telemetry-tag red"
              style={{ fontSize: 9, whiteSpace: 'nowrap' }}
            >
              ⚠ {f.replace(/_/g, ' ')}
            </span>
          ))}
          {cumulativeVectors.map(v => (
            <span
              key={v}
              className="telemetry-tag"
              style={{ fontSize: 9, whiteSpace: 'nowrap', borderColor: 'var(--border-subtle)' }}
            >
              {v.replace(/_/g, ' ')}
            </span>
          ))}
          {fatalFlags.length === 0 && cumulativeVectors.length === 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              NO CRITICAL ANOMALIES
            </span>
          )}
        </div>
      </div>

      <div className="risk-divider" style={{ width: 1, height: 32, background: 'var(--border-hairline)', flexShrink: 0 }} />

      {/* S3: Sanctions Hit & Resolved UBO */}
      <div style={{ minWidth: 150, display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          BENEFICIAL_OWNERSHIP
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sanctionsHit && (
            <span className="telemetry-tag red" style={{ fontSize: 8.5 }} title={sanctionsDetail || undefined}>
              OFAC HIT
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-white)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            {resolvedUbo || 'None Identified'}
          </span>
        </div>
      </div>
    </div>
  );
}
