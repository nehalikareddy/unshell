import { useState, useEffect } from 'react';
import { fetchHistory, fetchInvestigationById, deleteInvestigationApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function riskBadgeColor(score) {
  if (score == null) return { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-dim)', border: 'var(--border-hairline)' };
  if (score >= 70)   return { bg: 'var(--accent-red-dim)',  text: 'var(--accent-red)',   border: 'rgba(255, 65, 54, 0.4)' };
  if (score >= 40)   return { bg: 'var(--accent-amber-dim)',text: 'var(--accent-amber)', border: 'rgba(255, 179, 0, 0.4)' };
  return                    { bg: 'var(--accent-lime-dim)', text: 'var(--accent-lime)',  border: 'var(--border-lime)' };
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'JUST NOW';
  if (mins  < 60)  return `${mins}M AGO`;
  if (hours < 24)  return `${hours}H AGO`;
  if (days  < 7)   return `${days}D AGO`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

export default function HistoryPanel({ onLoad, onClose }) {
  const { user, openAuthModal } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (user) {
      Promise.resolve().then(() => {
        if (!ignore) setLoading(true);
      });
      fetchHistory(50)
        .then(data => {
          if (!ignore) {
            const list = Array.isArray(data) ? data : (data?.investigations ?? []);
            setItems(list);
            setLoading(false);
          }
        })
        .catch(e => {
          if (!ignore) {
            setError(e.message);
            setLoading(false);
          }
        });
    } else {
      Promise.resolve().then(() => {
        if (!ignore) setItems([]);
      });
    }
    return () => {
      ignore = true;
    };
  }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(50);
      const list = Array.isArray(data) ? data : (data?.investigations ?? []);
      setItems(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen(item) {
    setLoadingId(item._id);
    try {
      const full = await fetchInvestigationById(item._id);
      onLoad(full);
      if (onClose) onClose();
    } catch (e) {
      console.error('Failed to load investigation:', e);
      setError(e.message);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm('Delete this investigation record from your personal archive?')) return;
    setDeletingId(id);
    try {
      await deleteInvestigationApi(id);
      setItems(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert('Failed to delete record: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Not Signed In State ── */
  if (!user) {
    return (
      <div
        className="has-pin has-pin--top-left has-pin--top-right has-pin--bottom-left has-pin--bottom-right"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-hairline)',
          padding: '28px 24px',
          textAlign: 'center',
          marginTop: 16,
        }}
      >
        <div className="telemetry-tag red" style={{ marginBottom: 12 }}>
          AUTH_REQUIRED // ARCHIVE_LOCKED
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text-white)' }}>
          USER-SCOPED ARCHIVE
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
          Saved investigations are strictly isolated by investigator identity. Please sign in to see your personal case history.
        </p>
        <button
          onClick={openAuthModal}
          style={{
            background: 'var(--accent-lime)',
            color: '#000',
            border: 'none',
            padding: '8px 20px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          SIGN IN / REGISTER →
        </button>
      </div>
    );
  }

  return (
    <div
      className="has-pin has-pin--top-left has-pin--top-right"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-hairline)',
        padding: '20px 22px',
        marginTop: 16,
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-white)' }}>
            DOSSIER ARCHIVE // {user.name?.toUpperCase() || 'OPERATOR'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="telemetry-tag lime" style={{ fontSize: 10 }}>
            {items.length} SAVED
          </span>
          <button
            onClick={load}
            title="Refresh history"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-dim)',
              padding: '4px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            REFRESH
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
        ISOLATION_STATUS: STRICT // ONLY YOU CAN ACCESS THESE RECORDS
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '30px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
          FETCHING DOSSIERS...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', padding: '10px', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 12 }}>
          ERR // {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div style={{ padding: '36px 16px', textAlign: 'center', border: '1px dashed var(--border-hairline)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
            NO SAVED INVESTIGATIONS
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Enter a UK company registration number above to begin and archive your first forensic analysis.
          </div>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
          {items.map(item => {
            const rColor = riskBadgeColor(item.riskScore);
            const isLoadingThis = loadingId === item._id;
            const isDeletingThis = deletingId === item._id;

            return (
              <div
                key={item._id}
                onClick={() => handleOpen(item)}
                className="dotted-box"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  cursor: 'pointer',
                  opacity: isDeletingThis ? 0.4 : 1,
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      CRN[{item.crn}]
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {relativeTime(item.createdAt)}
                    </span>
                    {item.source === 'document' && (
                      <span className="telemetry-tag" style={{ fontSize: 9, padding: '1px 5px' }}>PDF</span>
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-white)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.companyName || 'Corporate Entity'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
                  {item.riskScore != null && (
                    <span
                      style={{
                        background: rColor.bg,
                        color: rColor.text,
                        border: `1px solid ${rColor.border}`,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                      }}
                    >
                      {item.riskScore}/100 {item.riskLabel || ''}
                    </span>
                  )}

                  <button
                    onClick={(e) => handleDelete(e, item._id)}
                    title="Delete record"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      fontSize: 13,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.target.style.color = 'var(--accent-red)')}
                    onMouseLeave={e => (e.target.style.color = 'var(--text-muted)')}
                  >
                    ✕
                  </button>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: isLoadingThis ? 'var(--accent-lime)' : 'var(--text-dim)',
                      fontWeight: 700,
                    }}
                  >
                    {isLoadingThis ? 'LOADING...' : 'OPEN →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
