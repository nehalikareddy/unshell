import { useState, useEffect } from 'react'
import { fetchHistory, fetchInvestigationById } from '../api/client'

/* ─── Design tokens — matches DualEntryGateway ─────────────────────── */
const C = {
  bg:       '#EDEAE1',
  white:    '#FFFFFF',
  border:   'rgba(0,0,0,0.07)',
  borderMd: 'rgba(0,0,0,0.10)',
  ink:      '#0A0A0A',
  inkMid:   '#3A3A3A',
  inkMuted: '#8A8A8A',
  inkFaint: '#BBBBBB',
}
const FONT = "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif"

/* ─── Risk badge colour ─────────────────────────────────────────────── */
function riskColor(score) {
  if (score == null) return { bg: '#F3F3F3', text: '#8A8A8A' }
  if (score >= 70)   return { bg: '#FEE2E2', text: '#B91C1C' }
  if (score >= 40)   return { bg: '#FEF3C7', text: '#B45309' }
  return                    { bg: '#DCFCE7', text: '#15803D' }
}

function riskLabel(score) {
  if (score == null) return 'Unknown'
  if (score >= 70)   return 'High'
  if (score >= 40)   return 'Medium'
  return 'Low'
}

/* ─── Icons ─────────────────────────────────────────────────────────── */
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const ChevronIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

/* ─── Relative time helper ──────────────────────────────────────────── */
function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/* ─── Main component ────────────────────────────────────────────────── */
export default function HistoryPanel({ onLoad }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(20)
      // Express returns { total, skip, limit, investigations: [] }
      const list = Array.isArray(data) ? data : (data?.investigations ?? [])
      setItems(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleOpen(item) {
    setLoadingId(item._id)
    try {
      const full = await fetchInvestigationById(item._id)
      onLoad(full)
    } catch (e) {
      console.error('Failed to load investigation:', e)
    } finally {
      setLoadingId(null)
    }
  }

  /* ── Empty / loading states ── */
  if (loading) return (
    <div style={styles.container}>
      <Header onRefresh={load} loading />
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.hint}>Loading past investigations…</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={styles.container}>
      <Header onRefresh={load} />
      <div style={styles.center}>
        <p style={{ fontSize: 13, color: '#B91C1C', marginBottom: 12 }}>Database unavailable</p>
        <p style={styles.hint}>{error}</p>
      </div>
    </div>
  )

  if (items.length === 0) return (
    <div style={styles.container}>
      <Header onRefresh={load} />
      <div style={styles.center}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🗂️</div>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.inkMid, marginBottom: 4 }}>No investigations yet</p>
        <p style={styles.hint}>Run your first investigation and it will appear here.</p>
      </div>
    </div>
  )

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hist-row:hover { background: rgba(0,0,0,0.03) !important; }
        .hist-row:active { background: rgba(0,0,0,0.06) !important; }
      `}</style>

      <Header onRefresh={load} count={items.length} />

      <div style={styles.list}>
        {items.map((item, i) => {
          const rc = riskColor(item.riskScore)
          const isLoading = loadingId === item._id
          return (
            <button
              key={item._id}
              className="hist-row"
              onClick={() => handleOpen(item)}
              disabled={!!loadingId}
              style={{
                ...styles.row,
                animationDelay: `${i * 0.04}s`,
                opacity: loadingId && !isLoading ? 0.5 : 1,
              }}
            >
              {/* Left: company info */}
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={styles.companyName}>
                  {item.companyName || item.crn || 'Unknown'}
                </div>
                <div style={styles.meta}>
                  <ClockIcon />
                  <span>{relativeTime(item.createdAt)}</span>
                  {item.crn && <><span style={{ color: C.border }}>·</span><span>CRN {item.crn}</span></>}
                </div>
              </div>

              {/* Right: risk badge + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ ...styles.badge, background: rc.bg, color: rc.text }}>
                  {item.riskScore != null ? `${item.riskScore} · ` : ''}{riskLabel(item.riskScore)}
                </span>
                <span style={{ color: isLoading ? C.inkFaint : C.inkMuted }}>
                  {isLoading
                    ? <div style={{ ...styles.spinner, width: 13, height: 13, borderWidth: 2 }} />
                    : <ChevronIcon />
                  }
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Header sub-component ──────────────────────────────────────────── */
function Header({ onRefresh, loading, count }) {
  return (
    <div style={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Recent Investigations</span>
        {count != null && (
          <span style={styles.countBadge}>{count}</span>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={styles.refreshBtn}
        title="Refresh"
      >
        <span style={{ display: 'flex', opacity: loading ? 0.4 : 1 }}><RefreshIcon /></span>
      </button>
    </div>
  )
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const styles = {
  container: {
    fontFamily: FONT,
    WebkitFontSmoothing: 'antialiased',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  countBadge: {
    background: C.ink,
    color: C.white,
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 99,
    padding: '1px 7px',
    letterSpacing: '0.02em',
  },
  refreshBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: C.inkMuted,
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    fontFamily: FONT,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    cursor: 'pointer',
    width: '100%',
    fontFamily: FONT,
    transition: 'background 0.12s, opacity 0.15s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
  },
  companyName: {
    fontSize: 13,
    fontWeight: 600,
    color: C.ink,
    marginBottom: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 200,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: C.inkMuted,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 99,
    padding: '3px 10px',
    letterSpacing: '0.01em',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 0',
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: C.inkMuted,
    maxWidth: 220,
    lineHeight: 1.6,
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2.5px solid rgba(0,0,0,0.1)',
    borderTopColor: C.ink,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    marginBottom: 10,
  },
}
