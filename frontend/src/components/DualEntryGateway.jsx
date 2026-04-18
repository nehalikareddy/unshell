import { useState } from 'react'

/* ─── Design tokens ─────────────────────────────────────────────────── */
const C = {
  bg:       '#EDEAE1',   // warm cream
  surface:  '#F7F5F0',   // slightly lighter cream for cards
  white:    '#FFFFFF',
  border:   'rgba(0,0,0,0.08)',
  ink:      '#0A0A0A',   // near-black
  inkMid:   '#3A3A3A',
  inkMuted: '#8A8A8A',
  pill:     '#F0EDE5',   // chip background
  pillBorder: 'rgba(0,0,0,0.10)',
  accent:   '#0A0A0A',
}

const DEMOS = [
  { label: 'Monzo',  crn: '09446231', tag: 'LOW RISK' },
  { label: 'IBS',    crn: '01683457', tag: 'MEDIUM' },
  { label: 'Seabon', crn: '06026625', tag: 'CRITICAL' },
]

const CRN_REGEX = /^([A-Z]{2}\d{6}|\d{8})$/i

/* ─── SVG icons ─────────────────────────────────────────────────────── */
const Icon = {
  graph: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  shield: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  lock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="3" ry="3"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  arrow: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
}

const FEATURES = [
  { Icon: Icon.graph,  title: 'Deep Graph Traversal',  desc: 'Recursively maps 6+ corporate layers' },
  { Icon: Icon.shield, title: 'Real-time Sanctions',   desc: 'OFAC SDN + EU HM Treasury live' },
  { Icon: Icon.lock,   title: 'Zero Data Retention',   desc: 'No PII stored or transmitted' },
]

/* ─── Error Modal ────────────────────────────────────────────────────── */
function ErrorModal({ message, onClose }) {
  if (!message) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: 24, padding: '36px 40px',
        maxWidth: 380, width: '90%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#FEF2F2', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>✕</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          Investigation Failed
        </div>
        <div style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.65, marginBottom: 28 }}>
          {message}
        </div>
        <button onClick={onClose} style={{
          background: C.ink, color: '#fff', border: 'none',
          borderRadius: 99, padding: '11px 32px',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>Dismiss</button>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function DualEntryGateway({ onInvestigateAPI, error }) {
  const [crn, setCrn]           = useState('')
  const [modalError, setMErr]   = useState(null)
  const [focused, setFocused]   = useState(false)
  const displayError = modalError || error

  function go(val) {
    const t = (val ?? crn).trim().toUpperCase()
    if (!t) return
    if (!CRN_REGEX.test(t)) {
      setMErr(`"${t}" is not a valid UK CRN.\n\nExpected: 8 digits (09446231) or 2-letter prefix + 6 digits (SC123456).`)
      return
    }
    onInvestigateAPI(t)
  }

  const canGo = crn.trim().length > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
      display: 'flex',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .unshell-gateway { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .demo-chip { transition: all 0.15s ease; cursor: pointer; }
        .demo-chip:hover { background: ${C.ink} !important; color: #fff !important; border-color: ${C.ink} !important; }
        .go-btn { transition: all 0.15s ease; }
        .go-btn:not(:disabled):hover { transform: scale(1.01); box-shadow: 0 8px 32px rgba(0,0,0,0.22) !important; }
        .go-btn:not(:disabled):active { transform: scale(0.98); }
        .feat-row { transition: transform 0.15s ease; }
        .feat-row:hover { transform: translateX(3px); }
      `}</style>

      <ErrorModal message={displayError} onClose={() => setMErr(null)} />

      {/* ═══ LEFT ═══════════════════════════════════════════════════ */}
      <div style={{
        width: '46%', maxWidth: 520, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center',
        padding: '72px 48px',
        textAlign: 'center',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 48, alignSelf: 'flex-start' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: C.white,
            boxShadow: '0 1px 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: C.ink,
            letterSpacing: '-0.02em',
          }}>U</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: '0.14em' }}>
            UNSHELL
          </span>
        </div>

        {/* Hero text */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{
            fontSize: 52, fontWeight: 800, color: C.ink,
            lineHeight: 1.0, letterSpacing: '-0.03em', margin: 0,
          }}>
            AML &amp; KYB
          </h1>
          <h2 style={{
            fontSize: 44, fontWeight: 300, color: C.inkMid,
            lineHeight: 1.1, letterSpacing: '-0.02em', margin: '4px 0 0',
          }}>
            Intelligence Graph
          </h2>
        </div>

        <p style={{
          fontSize: 14, color: C.inkMuted, lineHeight: 1.75,
          maxWidth: 320, marginBottom: 40, textAlign: 'center',
        }}>
          Autonomously traces corporate ownership chains, detects circular loops, and screens against global sanctions databases instantly.
        </p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', maxWidth: 320 }}>
          {FEATURES.map(({ Icon: Ic, title, desc }) => (
            <div key={title} className="feat-row" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: C.white,
                boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.inkMid, flexShrink: 0,
              }}><Ic /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{title}</div>
                <div style={{ fontSize: 12, color: C.inkMuted, marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ DIVIDER ════════════════════════════════════════════════ */}
      <div style={{
        width: 1, background: C.border, margin: '80px 0', flexShrink: 0,
      }} />

      {/* ═══ RIGHT ══════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '72px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="unshell-gateway">

          <h2 style={{
            fontSize: 22, fontWeight: 700, color: C.ink,
            letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            Start Investigation
          </h2>
          <p style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.65, marginBottom: 32 }}>
            Enter a UK company number to begin immediate forensic analysis.
          </p>

          {/* Input */}
          <label style={{ fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            REGISTRATION NUMBER
          </label>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: C.white, border: `1.5px solid ${focused ? C.ink : C.border}`,
            borderRadius: 16, overflow: 'hidden',
            boxShadow: focused
              ? '0 0 0 4px rgba(0,0,0,0.06)'
              : '0 1px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.18s ease',
          }}>
            <input
              id="crn-input"
              type="text"
              value={crn}
              onChange={e => setCrn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. 09446231"
              style={{
                flex: 1, height: 50, border: 'none', outline: 'none',
                background: 'transparent', padding: '0 18px',
                fontSize: 15, color: C.ink, fontFamily: 'inherit',
                letterSpacing: '0.01em',
              }}
            />
          </div>

          {/* Demo chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: C.inkMuted, fontWeight: 500 }}>Try Demo:</span>
            {DEMOS.map(d => (
              <button
                key={d.crn}
                className="demo-chip"
                onClick={() => setCrn(d.crn)}
                style={{
                  background: C.white,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 99, padding: '6px 14px',
                  fontSize: 12, fontWeight: 500, color: C.inkMid,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >{d.label}</button>
            ))}
          </div>

          {/* CTA */}
          <button
            id="btn-investigate-api"
            className="go-btn"
            disabled={!canGo}
            onClick={() => go()}
            style={{
              width: '100%', height: 52, marginTop: 28,
              background: canGo ? C.ink : '#D4D1C9',
              color: canGo ? '#fff' : C.inkMuted,
              border: 'none', borderRadius: 16,
              fontSize: 14, fontWeight: 600,
              cursor: canGo ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: canGo ? '0 4px 16px rgba(0,0,0,0.16)' : 'none',
              letterSpacing: '0.01em',
            }}
          >
            Investigate
            {canGo && <Icon.arrow />}
          </button>

          {/* Footer note */}
          <p style={{ fontSize: 11, color: C.inkMuted, textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
            UK Companies House · Live OFAC Screening · NetworkX Analysis
          </p>
        </div>
      </div>
    </div>
  )
}
