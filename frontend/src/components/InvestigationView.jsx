import { useState, useRef, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [mobileTab, setMobileTab] = useState('graph'); // 'graph' | 'entities'

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fileInputRef = useRef(null);

  const targetName = data.graph?.nodes?.[0]?.label || data.resolved_ubo || 'Target Entity';
  const panelWidth = selectedEdge ? 320 : 0;
  const nodeCount = data.graph?.nodes?.length || 0;

  function handleEntityClick(id) {
    setSelectedNodeId(id);
    if (isMobile) {
      setMobileTab('graph');
    }
  }

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
          minHeight: isMobile ? 50 : 56,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          zIndex: 30,
          padding: isMobile ? '0 12px' : '0 20px',
          gap: isMobile ? 8 : 14,
          justifyContent: 'space-between',
        }}
      >
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: 'var(--twilight-indigo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
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

        <div className="hide-on-mobile" style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* Investigating Target Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', flex: 1, margin: '0 4px' }}>
          <span className="hide-on-mobile" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
            TARGET:
          </span>
          <span
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-white)',
              fontFamily: 'var(--font-display)',
              fontSize: isMobile ? 11 : 12,
              fontWeight: 700,
              padding: '2px 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isMobile ? 140 : 260,
            }}
          >
            {targetName}
          </span>
          {crn && (
            <span className="telemetry-tag cyan" style={{ fontSize: isMobile ? 9 : 10, padding: '2px 6px' }}>
              CRN[{crn}]
            </span>
          )}
        </div>

        {/* Compact Scoreboard in Top Bar (Desktop Only) */}
        <div className="hide-on-mobile">
          <RiskScoreboard
            compact
            riskScore={data.risk_score}
            riskLabel={data.risk_label}
            confidence={null}
            resolvedUbo={data.resolved_ubo}
            sanctionsHit={data.sanctions_hit}
          />
        </div>

        <div className="hide-on-mobile" style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* User Scoping Pill (Desktop Only) */}
        <div
          className="hide-on-mobile"
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

        <div className="hide-on-mobile" style={{ width: 1, height: 18, background: 'var(--border-hairline)' }} />

        {/* Return Button */}
        <button
          onClick={onReset}
          className="dotted-btn"
          style={{
            padding: isMobile ? '5px 10px' : '6px 14px',
            fontSize: isMobile ? 10 : 11,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {isMobile ? '← NEW' : '← NEW INVESTIGATION'}
        </button>
      </div>

      {/* ── Mobile View Selector Tabs (Phone Only) ─────────────────────── */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-hairline)',
            padding: '5px 10px',
            gap: 8,
            flexShrink: 0,
            zIndex: 25,
          }}
        >
          <button
            type="button"
            onClick={() => setMobileTab('graph')}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: mobileTab === 'graph' ? 'var(--twilight-indigo)' : 'var(--bg-card)',
              color: mobileTab === 'graph' ? '#ffffff' : 'var(--text-light)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>📊</span>
            <span>GRAPH VIEW</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('entities')}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: mobileTab === 'entities' ? 'var(--twilight-indigo)' : 'var(--bg-card)',
              color: mobileTab === 'entities' ? '#ffffff' : 'var(--text-light)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>📋</span>
            <span>ENTITIES ({nodeCount})</span>
          </button>
        </div>
      )}

      {/* ── Dead-End Alert Banner (if applicable) ───────────────────── */}
      {data.is_dead_end && (
        <div
          style={{
            position: 'absolute',
            top: isMobile ? 96 : 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent-amber)',
            padding: isMobile ? '8px 14px' : '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            maxWidth: isMobile ? 'calc(100% - 24px)' : 620,
            width: isMobile ? 'calc(100% - 24px)' : 'auto',
          }}
          className="has-pin has-pin--top-left has-pin--top-right"
        >
          <div style={{ fontSize: 18 }}>⚠️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--text-white)', fontSize: isMobile ? 11 : 13, fontWeight: 700 }}>
              OFFSHORE DEAD-END IDENTIFIED
            </div>
            <div style={{ color: 'var(--accent-amber)', fontSize: isMobile ? 10 : 12 }}>
              Chain terminates in opaque jurisdiction.{' '}
              <span
                onClick={() => fileInputRef.current?.click()}
                style={{
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: 'var(--accent-lime)',
                }}
              >
                Upload Registry PDF to continue
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

      {/* ── Main Workspace Layout ────────────────────────────────────── */}
      {isMobile ? (
        /* Mobile Phone Layout: Tabbed view */
        <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          {mobileTab === 'graph' ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <GraphCanvas
                nodes={data.graph.nodes}
                edges={data.graph.edges}
                activeFilters={activeFilters}
                focusNodeId={selectedNodeId}
                onEdgeClick={edge => setSelectedEdge(edge)}
                onPaneClick={() => setSelectedEdge(null)}
              />

              {/* Mobile Bottom-Sheet Drawer for Selected Edge Evidence */}
              {selectedEdge && (
                <>
                  <div
                    onClick={() => setSelectedEdge(null)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(0,0,0,0.4)',
                      zIndex: 95,
                    }}
                  />
                  <div className="mobile-drawer-sheet" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--twilight-indigo)' }}>
                        CONNECTION EVIDENCE
                      </span>
                      <button
                        onClick={() => setSelectedEdge(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 16,
                          cursor: 'pointer',
                          color: 'var(--text-dim)',
                          padding: '2px 8px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <EvidencePanel
                      edge={selectedEdge}
                      nodes={data.graph.nodes}
                      stats={data.stats}
                      onClose={() => setSelectedEdge(null)}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
              <EntitySidebar
                nodes={data.graph.nodes}
                stats={data.stats}
                fatalFlags={data.fatal_flags}
                cumulativeVectors={data.cumulative_vectors}
                resolvedUbo={data.resolved_ubo}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                onEntityClick={handleEntityClick}
              />
            </div>
          )}
        </div>
      ) : (
        /* Desktop Layout: 3-column Grid */
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
      )}

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
