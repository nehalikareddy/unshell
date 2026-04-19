import { useState, useEffect, useRef } from 'react'

const C = {
  bg:       '#EDEAE1',
  white:    '#FFFFFF',
  border:   'rgba(0,0,0,0.07)',
  borderMd: 'rgba(0,0,0,0.10)',
  ink:      '#0A0A0A',
  inkMid:   '#3A3A3A',
  inkMuted: '#8A8A8A',
}

const FONT = "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif"

const STEPS = [
  { label: 'Fetching company registry data...' },
  { label: 'Building corporate ownership graph...' },
  { label: 'Running cycle detection algorithms...' },
  { label: 'Calculating multi-vector risk scores...' },
  { label: 'Screening against OFAC sanctions database...' },
  { label: 'Compiling forensic investigation report...' },
]

/* ─── Logo ───────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: C.white,
        boxShadow: '0 1px 0 rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, color: C.ink, flexShrink: 0,
      }}>U</div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: '0.13em' }}>
        UNSHELL
      </span>
    </div>
  )
}

/* ─── Orbital canvas spinner ─────────────────────────────────────────── */
function OrbitalSpinner() {
  const ref  = useRef(null)
  const rafR = useRef(null)
  const angR = useRef(0)

  useEffect(() => {
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')
    const W = 130, H = 130, CX = 65, CY = 65
    const R1 = 48, R2 = 30

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // outer dashed ring
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.10)'
      ctx.lineWidth = 1.2
      ctx.setLineDash([3, 8])
      ctx.beginPath(); ctx.arc(CX, CY, R1, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()

      // inner dashed ring
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 7])
      ctx.beginPath(); ctx.arc(CX, CY, R2, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()

      // outer dot glow
      const a1 = (angR.current - 90) * Math.PI / 180
      const dx1 = CX + R1 * Math.cos(a1), dy1 = CY + R1 * Math.sin(a1)
      const grd = ctx.createRadialGradient(dx1, dy1, 0, dx1, dy1, 14)
      grd.addColorStop(0, 'rgba(10,10,10,0.16)'); grd.addColorStop(1, 'rgba(10,10,10,0)')
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(dx1, dy1, 14, 0, Math.PI * 2); ctx.fill()
      // outer dot
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(dx1, dy1, 5, 0, Math.PI * 2); ctx.fill()

      // inner dot (opposite, faster)
      const a2 = (-angR.current * 1.7 - 90) * Math.PI / 180
      const dx2 = CX + R2 * Math.cos(a2), dy2 = CY + R2 * Math.sin(a2)
      ctx.fillStyle = 'rgba(0,0,0,0.30)'
      ctx.beginPath(); ctx.arc(dx2, dy2, 3.5, 0, Math.PI * 2); ctx.fill()

      // center pill
      ctx.save()
      ctx.fillStyle = C.white
      ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 2
      ctx.beginPath(); ctx.arc(CX, CY, 14, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI * 2); ctx.fill()

      angR.current = (angR.current + 1.3) % 360
      rafR.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafR.current)
  }, [])

  return <canvas ref={ref} width={130} height={130} style={{ display: 'block' }} />
}

/* ─── Step spinner ───────────────────────────────────────────────────── */
function StepSpin() {
  return (
    <>
      <style>{`@keyframes ss { to { transform: rotate(360deg); } } .ss { animation: ss 0.75s linear infinite; }`}</style>
      <div className="ss" style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid rgba(0,0,0,0.08)', borderTopColor: C.ink,
      }} />
    </>
  )
}

/* ─── Check icon ─────────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      background: 'rgba(0,0,0,0.06)', border: '1.5px solid rgba(0,0,0,0.14)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <polyline points="2,6 5,9 10,3" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function LoadingScreen({ crn }) {
  const [current, setCurrent] = useState(0)
  const [done, setDone]       = useState(new Set())

  useEffect(() => {
    const iv = setInterval(() => {
      setCurrent(prev => {
        const next = prev + 1
        setDone(d => new Set([...d, prev]))
        if (next >= STEPS.length) clearInterval(iv)
        return next
      })
    }, 3800)
    return () => clearInterval(iv)
  }, [])

  const progress = done.size / STEPS.length

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: FONT, WebkitFontSmoothing: 'antialiased',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top nav ──────────────────────────────────────────────────── */}
      <nav style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 40px',
        background: 'rgba(237,234,225,0.80)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <Logo />
      </nav>

      {/* ── Body — centered two‑column ───────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          width: '100%', maxWidth: 960,
        }}>

          {/* ── LEFT — spinner ─────────────────────────────────────── */}
          <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingRight: 64,
            textAlign: 'center',
          }}>
            <OrbitalSpinner />

            <div style={{
              fontSize: 18, fontWeight: 700, color: C.ink,
              letterSpacing: '-0.02em', marginTop: 20, marginBottom: 6,
            }}>
              Analysing
            </div>
            <div style={{ fontSize: 13, color: C.inkMuted, marginBottom: crn ? 12 : 0 }}>
              Autonomous pipeline running
            </div>
            {crn && (
              <span style={{
                display: 'inline-block',
                background: C.white, border: `1px solid ${C.borderMd}`,
                borderRadius: 99, padding: '4px 14px',
                fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: '0.05em',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>{crn}</span>
            )}
          </div>

          {/* ── DIVIDER ──────────────────────────────────────────────── */}
          <div style={{ width: 1, alignSelf: 'stretch', background: C.border, flexShrink: 0 }} />

          {/* ── RIGHT — steps ──────────────────────────────────────── */}
          <div style={{ flex: 1, paddingLeft: 64 }}>

            <h2 style={{
              fontSize: 28, fontWeight: 800, color: C.ink,
              letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 8,
            }}>
              Investigating Corporate<br />Structure
            </h2>
            <p style={{ fontSize: 13, color: C.inkMuted, marginBottom: 32, lineHeight: 1.65 }}>
              Multi-agent pipeline tracing ownership across jurisdictions
            </p>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STEPS.map((step, i) => {
                const isDone    = done.has(i)
                const isActive  = i === current
                const isPending = i > current
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 13,
                    padding: '12px 16px',
                    background: isActive ? C.white : 'transparent',
                    border: `1.5px solid ${isActive ? C.borderMd : 'transparent'}`,
                    borderRadius: 14,
                    boxShadow: isActive ? '0 2px 16px rgba(0,0,0,0.06)' : 'none',
                    opacity: isPending ? 0.32 : 1,
                    transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isDone   && <CheckIcon />}
                      {isActive && <StepSpin />}
                      {isPending && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.18)' }} />}
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : isDone ? 500 : 400,
                      color: isDone ? C.inkMid : isActive ? C.ink : C.inkMuted,
                      letterSpacing: '-0.01em', transition: 'color 0.3s',
                    }}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Progress */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: C.inkMuted, fontWeight: 500, letterSpacing: '0.01em' }}>Progress</span>
                <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 600 }}>{done.size}/{STEPS.length}</span>
              </div>
              <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: C.ink,
                  width: `${progress * 100}%`,
                  transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
