import { useState, useEffect, useRef } from 'react'

const C = {
  bg:       '#EDEAE1',
  white:    '#FFFFFF',
  border:   'rgba(0,0,0,0.08)',
  ink:      '#0A0A0A',
  inkMid:   '#3A3A3A',
  inkMuted: '#8A8A8A',
  inkFaint: 'rgba(0,0,0,0.18)',
}

const STEPS = [
  { label: 'Fetching company registry data...' },
  { label: 'Building corporate ownership graph...' },
  { label: 'Running cycle detection algorithms...' },
  { label: 'Calculating multi-vector risk scores...' },
  { label: 'Screening against OFAC sanctions database...' },
  { label: 'Compiling forensic investigation report...' },
]

/* ─── Orbital spinner (canvas-based, smooth) ────────────────────────── */
function OrbitalSpinner() {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const angleRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const W = 120, H = 120, CX = 60, CY = 60
    const R1 = 44   // outer ring
    const R2 = 28   // inner ring
    const dotR  = 5   // dot radius
    const dot2R = 3.5 // inner dot radius

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // ── Outer dashed ring
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 1.2
      ctx.setLineDash([3, 7])
      ctx.beginPath()
      ctx.arc(CX, CY, R1, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // ── Inner dashed ring
      ctx.save()
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 6])
      ctx.beginPath()
      ctx.arc(CX, CY, R2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // ── Outer orbital dot
      const a1 = (angleRef.current - 90) * Math.PI / 180
      const dx1 = CX + R1 * Math.cos(a1)
      const dy1 = CY + R1 * Math.sin(a1)

      // Glow behind dot
      const grd = ctx.createRadialGradient(dx1, dy1, 0, dx1, dy1, dotR * 3)
      grd.addColorStop(0, 'rgba(10,10,10,0.18)')
      grd.addColorStop(1, 'rgba(10,10,10,0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(dx1, dy1, dotR * 3, 0, Math.PI * 2)
      ctx.fill()

      // Dot itself
      ctx.fillStyle = C.ink
      ctx.beginPath()
      ctx.arc(dx1, dy1, dotR, 0, Math.PI * 2)
      ctx.fill()

      // ── Inner orbital dot (opposite direction, faster)
      const a2 = (-angleRef.current * 1.6 - 90) * Math.PI / 180
      const dx2 = CX + R2 * Math.cos(a2)
      const dy2 = CY + R2 * Math.sin(a2)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.arc(dx2, dy2, dot2R, 0, Math.PI * 2)
      ctx.fill()

      // ── Center pill circle
      ctx.save()
      ctx.fillStyle = C.white
      ctx.shadowColor = 'rgba(0,0,0,0.10)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      ctx.beginPath()
      ctx.arc(CX, CY, 13, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Center dot
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.arc(CX, CY, 3, 0, Math.PI * 2)
      ctx.fill()

      // Advance angle
      angleRef.current = (angleRef.current + 1.4) % 360
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      style={{ display: 'block' }}
    />
  )
}

/* ─── Checkmark icon ────────────────────────────────────────────────── */
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <polyline
        points="2,6 5,9 10,3"
        stroke={C.ink}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─── Inline step spinner ───────────────────────────────────────────── */
function StepSpinner() {
  return (
    <>
      <style>{`
        @keyframes stepSpin { to { transform: rotate(360deg); } }
        .step-spin { animation: stepSpin 0.75s linear infinite; }
      `}</style>
      <div className="step-spin" style={{
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid rgba(0,0,0,0.10)`,
        borderTopColor: C.ink,
      }} />
    </>
  )
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function LoadingScreen({ crn }) {
  const [current, setCurrent]     = useState(0)
  const [done, setDone]           = useState(new Set())

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
      minHeight: '100vh',
      background: C.bg,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      display: 'flex',
    }}>

      {/* ═══ LEFT ═══════════════════════════════════════════════════ */}
      <div style={{
        width: '46%', maxWidth: 520, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '72px 48px',
        textAlign: 'center',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 64, alignSelf: 'flex-start' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: C.white,
            boxShadow: '0 1px 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: C.ink,
          }}>U</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, letterSpacing: '0.14em' }}>
            UNSHELL
          </span>
        </div>

        {/* Spinner */}
        <div style={{ marginBottom: 28 }}>
          <OrbitalSpinner />
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em', marginBottom: 6, marginTop: 24 }}>
          Analysing
        </div>
        <div style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.5 }}>
          Autonomous pipeline running
        </div>
        {crn && (
          <div style={{ marginTop: 10 }}>
            <span style={{
              display: 'inline-block',
              background: C.white, border: `1px solid ${C.border}`,
              borderRadius: 99, padding: '4px 12px',
              fontSize: 11, fontWeight: 600, color: C.inkMid,
              letterSpacing: '0.04em',
            }}>{crn}</span>
          </div>
        )}
      </div>

      {/* ═══ DIVIDER ════════════════════════════════════════════════ */}
      <div style={{ width: 1, background: C.border, margin: '80px 0', flexShrink: 0 }} />

      {/* ═══ RIGHT ══════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '72px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          <h2 style={{
            fontSize: 28, fontWeight: 800, color: C.ink,
            letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 10,
          }}>
            Investigating Corporate<br />Structure
          </h2>
          <p style={{ fontSize: 13, color: C.inkMuted, marginBottom: 36, lineHeight: 1.65 }}>
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
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 16px',
                  background: isActive ? C.white : 'transparent',
                  borderRadius: 14,
                  border: `1.5px solid ${isActive ? C.border : 'transparent'}`,
                  boxShadow: isActive ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
                  opacity: isPending ? 0.35 : 1,
                  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                }}>

                  {/* Status */}
                  <div style={{
                    width: 20, height: 20, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isDone && (
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.06)',
                        border: `1.5px solid rgba(0,0,0,0.15)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckIcon />
                      </div>
                    )}
                    {isActive && <StepSpinner />}
                    {isPending && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.18)',
                      }} />
                    )}
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize: 13,
                    fontWeight: isActive ? 600 : isDone ? 500 : 400,
                    color: isDone ? C.inkMid : isActive ? C.ink : C.inkMuted,
                    letterSpacing: '-0.01em',
                    transition: 'color 0.3s ease',
                  }}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Progress */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: C.inkMuted, fontWeight: 500, letterSpacing: '0.02em' }}>
                Progress
              </span>
              <span style={{ fontSize: 12, color: C.inkMid, fontWeight: 600 }}>
                {done.size}/{STEPS.length}
              </span>
            </div>
            <div style={{
              height: 3, background: 'rgba(0,0,0,0.08)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: C.ink,
                width: `${progress * 100}%`,
                transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
