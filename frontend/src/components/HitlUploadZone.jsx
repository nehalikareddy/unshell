import { useState, useRef } from 'react'

export default function HitlUploadZone({ pauseReason, partialGraph, riskScore, onResume, onReset, onClose, asModal }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  function handleDragOver(e) { e.preventDefault(); setIsDragging(true) }
  function handleDragLeave() { setIsDragging(false) }
  function handleDrop(e) {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') setSelectedFile(file)
  }
  function handleFileChange(e) { if (e.target.files[0]) setSelectedFile(e.target.files[0]) }
  function formatSize(b) { return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB` }

  return (
    <div style={{
      width: asModal ? 880 : '100%',
      minHeight: asModal ? 520 : '100vh',
      borderRadius: asModal ? 16 : 0,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'var(--cream)',
      fontFamily: "'Inter', system-ui, sans-serif",
      boxShadow: asModal ? '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,168,72,0.2)' : 'none',
    }}>

      {/* ── TOP BANNER ─────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--dark-2)',
        borderBottom: '2px solid var(--amber)',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: '#fff',
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, cursor: 'pointer',
              transition: 'background 0.2s',
            }} onMouseOver={e=>e.target.style.background='rgba(255, 70, 70, 0.8)'} onMouseOut={e=>e.target.style.background='rgba(255, 255, 255, 0.1)'} title="Close">
              ✕
            </button>
          )}
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--coral) 0%, var(--purple) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
          }}>U</div>
          <span style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.12em' }}>UNSHELL / PROJECT FUSION</span>
          <span style={{ color: 'var(--dark-4)', fontSize: 13 }}>›</span>
          <span style={{ color: 'var(--amber)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
            ⏸ INVESTIGATION PAUSED
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {riskScore != null && (
            <div style={{
              background: 'var(--amber-muted)', border: '1px solid rgba(232,168,72,0.5)',
              borderRadius: 'var(--r-pill)', padding: '4px 14px',
              color: 'var(--amber)', fontSize: 12, fontWeight: 700,
            }}>
              Risk Score: {riskScore} / 100
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex' }}>

        {/* Left dark info panel */}
        <div style={{
          width: 380, flexShrink: 0,
          background: 'var(--dark)',
          padding: '40px 36px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          {/* Anchor icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--amber-muted)',
            border: '1px solid rgba(232,168,72,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, marginBottom: 24,
          }}>⚓</div>

          <h2 style={{ color: 'var(--text-light)', fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
            Offshore Dead-End Detected
          </h2>
          <p style={{ color: 'var(--amber)', fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>
            {pauseReason || 'The investigation encountered an entity that could not be resolved via public APIs.'}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.7, marginBottom: 32 }}>
            Upload a beneficial ownership document (e.g. a BVI incorporation certificate or offshore registry extract) to continue the investigation.
          </p>

          {/* Partial graph stats */}
          <div style={{
            background: 'var(--dark-2)', border: '1px solid var(--border-dark)',
            borderRadius: 'var(--r-md)', padding: '14px 16px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 600 }}>
              Progress so far
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Entities Found', value: partialGraph?.nodes?.length ?? 0, color: 'var(--teal)' },
                { label: 'Links Mapped', value: partialGraph?.edges?.length ?? 0, color: 'var(--purple)' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right cream upload panel */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 48px',
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            <h3 style={{ color: 'var(--text-dark)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Upload Offshore Document
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              Drag and drop or browse for the beneficiary ownership PDF to resume forensic analysis.
            </p>

            {/* Drop zone */}
            <div
              id="hitl-drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              style={{
                width: '100%', height: 154,
                border: `2px dashed ${isDragging ? 'var(--amber)' : 'var(--border-light)'}`,
                borderRadius: 'var(--r-lg)',
                background: isDragging ? 'var(--amber-muted)' : 'var(--white)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: isDragging ? 'var(--amber-muted)' : 'var(--cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>📂</div>
              <span style={{ fontSize: 14, color: 'var(--text-dark)', fontWeight: 500 }}>Drop offshore document here</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or <span style={{ color: 'var(--amber)', fontWeight: 600 }}>click to browse</span> — PDF only</span>
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>

            {/* File info */}
            {selectedFile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 10,
                background: 'var(--green-muted)', border: '1px solid rgba(92,184,122,0.35)',
                borderRadius: 'var(--r-md)', padding: '10px 14px',
              }}>
                <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatSize(selectedFile.size)}</div>
                </div>
              </div>
            )}

            {/* Resume button */}
            <button
              id="btn-resume-investigation"
              disabled={!selectedFile}
              onClick={() => onResume(selectedFile)}
              style={{
                width: '100%', height: 48, marginTop: 20,
                background: selectedFile
                  ? 'linear-gradient(135deg, var(--amber) 0%, var(--coral) 100%)'
                  : 'var(--cream-2)',
                color: selectedFile ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 'var(--r-md)',
                fontSize: 13, fontWeight: 700, letterSpacing: '0.06em',
                cursor: selectedFile ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'opacity 0.2s, transform 0.1s',
                boxShadow: selectedFile ? '0 4px 20px rgba(232,168,72,0.35)' : 'none',
              }}
              onMouseEnter={e => { if (selectedFile) { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (selectedFile) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' } }}
            >
              Resume Investigation →
            </button>

            {/* Reset */}
            <button
              id="btn-new-investigation"
              onClick={onReset}
              style={{
                width: '100%', marginTop: 10, padding: '10px',
                background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'color 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              ← Start New Investigation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
