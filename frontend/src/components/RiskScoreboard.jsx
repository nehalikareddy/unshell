import React from 'react';

const RISK_BANNER = {
  CRITICAL:     { bg: 'rgba(211, 47, 47, 0.08)',  border: 'var(--accent-red)',   text: 'var(--accent-red)' },
  CRITICAL_SAR: { bg: 'rgba(211, 47, 47, 0.08)',  border: 'var(--accent-red)',   text: 'var(--accent-red)' },
  AUTO_REJECT:  { bg: 'rgba(211, 47, 47, 0.08)',  border: 'var(--accent-red)',   text: 'var(--accent-red)' },
  HIGH_RISK:    { bg: 'rgba(255, 100, 54, 0.08)', border: '#FF6436',            text: '#FF6436' },
  EDD_REQUIRED: { bg: 'rgba(217, 119, 6, 0.08)',  border: 'var(--accent-amber)', text: 'var(--accent-amber)' },
  MEDIUM_RISK:  { bg: 'rgba(217, 119, 6, 0.08)',  border: 'var(--accent-amber)', text: 'var(--accent-amber)' },
  MANUAL_REVIEW:{ bg: 'rgba(217, 119, 6, 0.08)',  border: 'var(--accent-amber)', text: 'var(--accent-amber)' },
  AUTO_APPROVE: { bg: 'rgba(46, 125, 50, 0.08)',   border: 'var(--accent-green)',  text: 'var(--accent-green)' },
  LOW_RISK:     { bg: 'rgba(46, 125, 50, 0.08)',   border: 'var(--accent-green)',  text: 'var(--accent-green)' },
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
        height: 60,
        minHeight: 60,
        maxHeight: 60,
        flexShrink: 0,
        background: '#ffffff',
        borderTop: '1px solid var(--border-hairline)',
        borderLeft: `4px solid ${banner.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 18,
        zIndex: 30,
        width: '100%',
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box',
      }}
    >
      {/* S1: Score telemetry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 125, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
          RISK_SCORE
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ color: banner.text, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{riskScore ?? '--'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/100</span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: banner.text,
              background: banner.bg,
              border: `1px solid ${banner.border}`,
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {riskLabel ? riskLabel.replace(/_/g, ' ') : 'ANALYZED'}
          </span>
        </div>
      </div>

      <div className="risk-divider" style={{ width: 1, height: 32, background: 'var(--border-hairline)', flexShrink: 0 }} />

      {/* S2: Flags / Detected Risk Vectors */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 140 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
          EVIDENCE_VECTORS
        </span>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center', paddingBottom: 1 }}>
          {fatalFlags.map(f => (
            <span
              key={f}
              className="telemetry-tag red"
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: '1px solid var(--accent-red)',
                background: 'rgba(211, 47, 47, 0.08)',
                color: 'var(--accent-red)',
              }}
            >
              <span>⚠</span>
              <span>{f.replace(/_/g, ' ')}</span>
            </span>
          ))}
          {cumulativeVectors.map(v => (
            <span
              key={v}
              className="telemetry-tag"
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-white)',
              }}
            >
              {v.replace(/_/g, ' ')}
            </span>
          ))}
          {fatalFlags.length === 0 && cumulativeVectors.length === 0 && (
            <span style={{ fontSize: 10, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ✓ NO CRITICAL ANOMALIES
            </span>
          )}
        </div>
      </div>

      <div className="risk-divider" style={{ width: 1, height: 32, background: 'var(--border-hairline)', flexShrink: 0 }} />

      {/* S3: Sanctions Hit & Resolved UBO */}
      <div style={{ minWidth: 160, maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
          BENEFICIAL_OWNERSHIP
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sanctionsHit && (
            <span className="telemetry-tag red" style={{ fontSize: 8.5, padding: '2px 5px', fontWeight: 700 }} title={sanctionsDetail || undefined}>
              OFAC HIT
            </span>
          )}
          <span
            title={resolvedUbo || 'None Identified'}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              color: resolvedUbo?.includes('Unresolved') ? 'var(--accent-amber)' : 'var(--text-white)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {resolvedUbo || 'None Identified'}
          </span>
        </div>
      </div>

      {/* S4: System Telemetry & Integrity (Desktop Only) */}
      <div className="risk-divider hide-on-mobile" style={{ width: 1, height: 32, background: 'var(--border-hairline)', flexShrink: 0 }} />

      <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginLeft: 'auto', textAlign: 'right' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
          FORENSIC_INTEGRITY
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E7D32', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--twilight-indigo)' }}>
            CH_API // TARJAN: VERIFIED
          </span>
        </div>
      </div>
    </div>
  );
}
