import { useState } from 'react';
import HistoryPanel from './HistoryPanel';
import { useAuth } from '../context/AuthContext';
import { investigateByDocument, normalizeCrn, CRN_REGEX } from '../api/client';

const DEMOS = [
  { label: 'Monzo Bank Ltd', crn: '09446231', tag: 'FinTech Banking' },
  { label: 'Revolut Ltd',    crn: '08804411', tag: 'FinTech Unicorn' },
  { label: 'Seabon Limited', crn: '06026625', tag: 'Maritime Logistics' },
];

export default function DualEntryGateway({ onInvestigateAPI, onInvestigateDocument, onLoadHistory, error, onClearError = () => {} }) {
  const { user, logout, openAuthModal } = useAuth();
  const [activeTab, setActiveTab]   = useState('crn'); // 'crn' | 'document'
  const [crn, setCrn]               = useState('');
  const [modalErr, setMErr]         = useState(null);
  const [focused, setFocused]       = useState(false);
  const [showHistory, setHistory]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const displayError = modalErr || error;
  const canGo = crn.trim().length > 0;

  function handleDismissError() {
    setMErr(null);
    onClearError();
  }

  function go(val) {
    const raw = val ?? crn;
    const normalized = normalizeCrn(raw);
    if (!normalized) return;
    if (!CRN_REGEX.test(normalized)) {
      setMErr(`"${raw.trim()}" is not a valid UK CRN. Enter up to 8 digits (e.g. 09446231) or a valid prefix + digits (e.g. SC123456, OC301234).`);
      return;
    }
    setMErr(null);
    onClearError();
    setCrn(normalized);
    onInvestigateAPI(normalized);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setMErr('Only official PDF registry filings are accepted for document analysis.');
      return;
    }
    setIsUploading(true);
    setMErr(null);
    try {
      const result = await investigateByDocument(file);
      onLoadHistory(result);
    } catch (err) {
      setMErr(err.message || 'Document forensic analysis failed.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-obsidian)',
        color: 'var(--text-white)',
        fontFamily: 'var(--font-sans)',
        position: 'relative',
        overflowX: 'hidden',
      }}
      className="bg-tech-grid"
    >
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <nav className="gateway-nav">
        {/* Brand Logo & Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--twilight-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: '-0.02em',
              }}
            >
              U
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  color: 'var(--text-white)',
                }}
              >
                UNSHELL
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.08em',
                }}
              >
                KYB // FORENSICS
              </span>
            </div>
          </div>

          <div className="nav-telemetry-chip" style={{ width: 1, height: 18, background: 'var(--border-hairline)', margin: '0 4px' }} />

          {/* Live status chip (Haoqi / Sharplink style) */}
          <div className="telemetry-tag lime nav-telemetry-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="live-dot" />
            <span>SYS[LIVE]</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>CH_UK[ONLINE]</span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>OFAC_SDN[ACTIVE]</span>
          </div>
        </div>

        {/* Right Nav Actions & User Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* History drawer quick toggle */}
          <button
            onClick={() => setHistory(h => !h)}
            className="dotted-btn"
            style={{
              padding: '6px 14px',
              fontSize: 11,
              borderColor: showHistory ? 'var(--accent-lime)' : 'var(--border-subtle)',
              color: showHistory ? 'var(--accent-lime)' : 'var(--text-white)',
            }}
          >
            {showHistory ? 'CLOSE ARCHIVE [-]' : 'CASE ARCHIVE [+]'}
          </button>

          {/* User Profile / Auth State */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-hairline)',
                  padding: '5px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: 'var(--accent-lime)', fontWeight: 700 }}>AGENT:</span>
                <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{user.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{user.role || 'INVESTIGATOR'}</span>
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-dim)',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.target.style.color = 'var(--accent-red)';
                  e.target.style.borderColor = 'var(--accent-red)';
                }}
                onMouseLeave={e => {
                  e.target.style.color = 'var(--text-dim)';
                  e.target.style.borderColor = 'var(--border-hairline)';
                }}
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              style={{
                background: 'var(--twilight-indigo)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(49, 61, 90, 0.2)',
              }}
            >
              INVESTIGATOR SIGN IN →
            </button>
          )}
        </div>
      </nav>

      {/* ── Error Notification ────────────────────────────────────────── */}
      {displayError && (
        <div
          style={{
            position: 'fixed',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent-red)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          }}
          className="has-pin has-pin--top-left has-pin--top-right"
        >
          <div style={{ color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
            ALERT // {displayError}
          </div>
          {crn && (
            <button
              onClick={() => go(crn)}
              style={{
                background: 'rgba(235, 94, 85, 0.15)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '4px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              RETRY
            </button>
          )}
          <button
            onClick={handleDismissError}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            [X]
          </button>
        </div>
      )}

      {/* ── Main Hero & Terminal Container ────────────────────────────── */}
      <main className="gateway-main">
        <div className="gateway-grid">
          {/* ── LEFT COLUMN: Editorial & Intelligence Narrative ─────────── */}
          <div>
            {/* System Coordinate Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <span className="telemetry-tag cyan">
                COORDINATES[0001 X 0001 Y]
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                UK::COMPANIES_HOUSE // SDN_OFAC
              </span>
            </div>

            {/* Hero Heading (Sharplink + Haoqi Bold Condensed Display) */}
            <h1 className="hero-heading">
              AUTONOMOUS <br />
              <span style={{ color: 'var(--accent-lime)' }}>OWNERSHIP</span> <br />
              FORENSICS.
            </h1>

            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--text-dim)',
                maxWidth: 460,
                marginBottom: 36,
              }}
            >
              Deep-graph intelligence engine engineered to dismantle shell company architectures,
              expose ultimate beneficial owners (UBOs), detect circular corporate holding loops,
              and screen against global sanctions registries in seconds.
            </p>

            {/* Technical Capability Specs (Haoqi style) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  code: 'SPEC::01',
                  title: 'Depth-6 Recursive Traversal',
                  desc: 'Traverses layered offshore jurisdictions and nested holding networks.',
                },
                {
                  code: 'SPEC::02',
                  title: 'OFAC & Global Sanctions Screening',
                  desc: 'Cross-verifies individual directors & corporate vehicles against US/EU/UK watchlists.',
                },
                {
                  code: 'SPEC::03',
                  title: 'Isolated User Intelligence Archives',
                  desc: 'Investigations are cryptographic & strictly scoped to your investigator identity.',
                },
              ].map((spec) => (
                <div
                  key={spec.code}
                  className="dotted-box"
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--accent-lime)',
                      marginTop: 2,
                    }}
                  >
                    {spec.code}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-white)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {spec.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      {spec.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Interactive Forensic Terminal ───────────────── */}
          <div>
            <div className="has-pin has-pin--top-left has-pin--top-right has-pin--bottom-left has-pin--bottom-right gateway-card">
              {/* Terminal Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 24,
                  borderBottom: '1px solid var(--border-hairline)',
                  paddingBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="live-dot" />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--accent-lime)',
                    }}
                  >
                    INVESTIGATION_GATEWAY // V2.0
                  </span>
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  SEC_LEVEL: 04 // OPERATIONAL
                </div>
              </div>

              {/* Mode Selector Tabs (CRN vs PDF Document) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                  background: 'var(--bg-surface)',
                  padding: 3,
                  border: '1px solid var(--border-hairline)',
                  marginBottom: 24,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('crn')}
                  style={{
                    background: activeTab === 'crn' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'crn' ? 'var(--accent-lime)' : 'var(--text-dim)',
                    border: activeTab === 'crn' ? '1px solid var(--border-lime)' : '1px solid transparent',
                    padding: '8px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  UK Registry CRN
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('document')}
                  style={{
                    background: activeTab === 'document' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'document' ? 'var(--accent-lime)' : 'var(--text-dim)',
                    border: activeTab === 'document' ? '1px solid var(--border-lime)' : '1px solid transparent',
                    padding: '8px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  PDF Document Upload
                </button>
              </div>

              {/* ── TAB 1: CRN INPUT ── */}
              {activeTab === 'crn' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--text-light)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                    }}
                  >
                    TARGET_COMPANY_CRN
                  </label>

                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: `1px solid ${focused ? 'var(--accent-lime)' : 'var(--border-subtle)'}`,
                      transition: 'border-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      id="crn-input"
                      type="text"
                      value={crn}
                      onChange={e => setCrn(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && go()}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="e.g. 09446231 or SC123456"
                      style={{
                        width: '100%',
                        height: 52,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        padding: '0 18px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text-white)',
                        letterSpacing: '0.04em',
                      }}
                    />
                    {crn && (
                      <button
                        onClick={() => setCrn('')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          padding: '0 16px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                        }}
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Demo Targets (Sharplink + Haoqi Chips) */}
                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        letterSpacing: '0.08em',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                      }}
                    >
                      PRELOADED INTELLIGENCE DOSSIERS:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {DEMOS.map(d => (
                        <button
                          key={d.crn}
                          className="dotted-btn"
                          onClick={() => {
                            setMErr(null);
                            onClearError();
                            setCrn(d.crn);
                            go(d.crn);
                          }}
                          style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'var(--bg-surface)',
                          }}
                        >
                          <span style={{ color: 'var(--accent-lime)' }}>▶</span>
                          <span style={{ fontWeight: 700 }}>{d.label}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>[{d.crn}]</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main Action Button */}
                  <button
                    id="btn-investigate-api"
                    disabled={!canGo}
                    onClick={() => go()}
                    style={{
                      width: '100%',
                      height: 52,
                      marginTop: 26,
                      background: canGo ? 'var(--twilight-indigo)' : 'var(--bg-surface)',
                      color: canGo ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: canGo ? 'pointer' : 'not-allowed',
                      transition: 'all 0.18s ease',
                      boxShadow: canGo ? '0 6px 20px rgba(49, 61, 90, 0.25)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                    }}
                  >
                    <span>INITIALIZE FORENSIC TRACE</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* ── TAB 2: PDF DOCUMENT UPLOAD ── */}
              {activeTab === 'document' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--text-light)',
                      marginBottom: 12,
                      textTransform: 'uppercase',
                    }}
                  >
                    SELECT_REGISTRY_FILING [PDF]
                  </label>

                  <div
                    style={{
                      border: '2px dashed var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      padding: '36px 20px',
                      textAlign: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload({ target: { files: [file] } });
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--accent-lime)' }}>⇪</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-white)' }}>
                      {isUploading ? 'EXTRACTING EVIDENCE...' : 'DRAG PDF HERE OR BROWSE'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      Maximum 50MB · Official Companies House Accounts or Offshore Registries
                    </div>
                  </div>
                </div>
              )}

              {/* User Isolation Notice */}
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                }}
              >
                <span>LOCK_STATUS:</span>
                <span style={{ color: user ? 'var(--accent-lime)' : 'var(--accent-amber)' }}>
                  {user ? `SAVED TO ${user.email?.toUpperCase()}` : 'SIGN IN TO PRESERVE TO YOUR ACCOUNT'}
                </span>
              </div>

              {/* In-Card Case Archive Button */}
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-hairline)' }}>
                <button
                  id="btn-toggle-case-archive"
                  type="button"
                  onClick={() => setHistory(h => !h)}
                  className="dotted-btn"
                  style={{
                    width: '100%',
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 11,
                    borderColor: showHistory ? 'var(--accent-lime)' : 'var(--border-subtle)',
                    color: showHistory ? 'var(--accent-lime)' : 'var(--text-light)',
                  }}
                >
                  <span>📁</span>
                  <span>{showHistory ? 'HIDE ISOLATED CASE ARCHIVE [-]' : 'OPEN YOUR ISOLATED CASE ARCHIVE [+]'}</span>
                </button>
              </div>
            </div>

            {/* History Panel Drawer attached below or toggleable */}
            {showHistory && (
              <HistoryPanel
                onLoad={onLoadHistory}
                onClose={() => setHistory(false)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
