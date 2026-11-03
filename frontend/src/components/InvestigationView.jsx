import { useState, useRef } from 'react';
import GraphCanvas from './GraphCanvas';
import EvidencePanel from './EvidencePanel';
import RiskScoreboard from './RiskScoreboard';
import EntitySidebar from './EntitySidebar';
import { useAuth } from '../context/AuthContext';

export default function InvestigationView({
  data,
  crn = '',
  onReset = () => {},
  onUploadDocument = () => {},
}) {
  const { user } = useAuth();
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);

  const fileInputRef = useRef(null);

  const targetName = data.graph?.nodes?.[0]?.label || data.resolved_ubo || 'Target Entity';
  const panelWidth = selectedEdge ? 320 : 0;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-obsidian)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Top Bar (Dark Titanium Telemetry Bar) ────────────────────── */}
      <div
        style={{
          height: 56,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 30,
          padding: '0 20px',
          gap: 14,
        }}
      >
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--accent-lime)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontFamily: 'var(--font-mono)',
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            U
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: 'var(--text-white)',
            }}
          >
            UNSHELL
          </span>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* Investigating Target Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            TARGET_ENTITY:
          </span>
          <span
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-display)',
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 10px',
            }}
          >
            {targetName}
          </span>
          {crn && (
            <span className="telemetry-tag cyan" style={{ fontSize: 10 }}>
              CRN[{crn}]
            </span>
          )}
        </div>

        {/* Compact Scoreboard in Top Bar */}
        <RiskScoreboard
          compact
          riskScore={data.risk_score}
          riskLabel={data.risk_label}
          confidence={null}
          resolvedUbo={data.resolved_ubo}
          sanctionsHit={data.sanctions_hit}
        />

        <div style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* User Scoping Pill */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: user ? 'var(--accent-lime)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: 'var(--text-dim)' }}>ARCHIVED_TO:</span>
          <span>{user ? user.email : 'GUEST_SESSION'}</span>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* Return Button */}
        <button
          onClick={onReset}
          className="dotted-btn"
          style={{
            padding: '6px 14px',
            fontSize: 11,
            whiteSpace: 'nowrap',
          }}
        >
          ← NEW INVESTIGATION
        </button>
      </div>

      {/* ── Dead-End Alert Banner (if applicable) ───────────────────── */}
      {data.is_dead_end && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent-amber)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            maxWidth: 620,
          }}
          className="has-pin has-pin--top-left has-pin--top-right"
        >
          <div style={{ fontSize: 20 }}>⚠️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-white)', fontSize: 13, fontWeight: 700 }}>
              OFFSHORE HOLDING DEAD-END IDENTIFIED
            </div>
            <div style={{ color: 'var(--accent-amber)', fontSize: 12 }}>
              Target ownership chain terminates in an opaque jurisdiction without public PSC data.{' '}
              <span
                onClick={() => fileInputRef.current?.click()}
                style={{
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: 'var(--accent-lime)',
                }}
              >
                Upload Registry PDF / Trust Deed to continue
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="application/pdf"
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadDocument(e.target.files[0]);
          }
        }}
      />

      {/* ── 3-Column Layout: Sidebar / Graph / Evidence Panel ───────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `230px 1fr ${panelWidth}px`,
          transition: 'grid-template-columns 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        <EntitySidebar
          nodes={data.graph.nodes}
          stats={data.stats}
          fatalFlags={data.fatal_flags}
          cumulativeVectors={data.cumulative_vectors}
          resolvedUbo={data.resolved_ubo}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onEntityClick={id => setSelectedNodeId(id)}
        />

        <GraphCanvas
          nodes={data.graph.nodes}
          edges={data.graph.edges}
          activeFilters={activeFilters}
          focusNodeId={selectedNodeId}
          onEdgeClick={edge => setSelectedEdge(edge)}
          onPaneClick={() => setSelectedEdge(null)}
        />

        <div style={{ overflow: 'hidden' }}>
          {selectedEdge && (
            <EvidencePanel
              edge={selectedEdge}
              nodes={data.graph.nodes}
              stats={data.stats}
              onClose={() => setSelectedEdge(null)}
            />
          )}
        </div>
      </div>

      {/* ── Bottom Scoreboard ────────────────────────────────────────── */}
      <RiskScoreboard
        riskScore={data.risk_score}
        riskLabel={data.risk_label}
        fatalFlags={data.fatal_flags}
        cumulativeVectors={data.cumulative_vectors}
        confidence={null}
        sanctionsHit={data.sanctions_hit}
        sanctionsDetail={data.sanctions_detail}
        resolvedUbo={data.resolved_ubo}
      />
    </div>
  );
}
