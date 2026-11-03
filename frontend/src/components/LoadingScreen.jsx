import { useState, useEffect } from 'react';

const STEPS = [
  { label: 'Connecting to UK Companies House live registry...', duration: 900 },
  { label: 'Ingesting PSC records and officer appointments...', duration: 1200 },
  { label: 'Building corporate ownership graph traversal tree...', duration: 1500 },
  { label: 'Executing Tarjan cycle detection for circular ownership loops...', duration: 1400 },
  { label: 'Screening all nodes against OFAC SDN & EU sanctions databases...', duration: 1600 },
  { label: 'Synthesizing multi-vector risk scores & generating evidence audit trail...', duration: 1800 },
];

export default function LoadingScreen({ crn }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let timeout;
    if (currentStep < STEPS.length - 1) {
      timeout = setTimeout(() => {
        setCurrentStep(s => s + 1);
      }, STEPS[currentStep].duration);
    }
    return () => clearTimeout(timeout);
  }, [currentStep]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-obsidian)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-sans)',
      }}
      className="bg-tech-grid"
    >
      <div
        className="has-pin has-pin--top-left has-pin--top-right has-pin--bottom-left has-pin--bottom-right"
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          padding: '40px 36px',
          boxShadow: '0 16px 48px rgba(24, 54, 66, 0.1), 0 1px 4px rgba(24, 54, 66, 0.05)',
          position: 'relative',
        }}
      >
        {/* Top Telemetry Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div className="telemetry-tag lime">
            <span className="live-dot" />
            <span>TRACE_EXECUTION // ACTIVE</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--twilight-indigo)' }}>
            TARGET_CRN[{crn || 'UK_REGISTRY'}]
          </div>
        </div>

        {/* Radar Scanner Animation (Periwinkle & Vintage Lavender - Fully Animated) */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 32px' }}>
          <div
            style={{
              position: 'relative',
              width: 104,
              height: 104,
              borderRadius: '50%',
              border: '1.5px solid var(--vintage-lavender)',
              background: 'rgba(203, 197, 234, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 18px rgba(115, 98, 138, 0.16), 0 4px 16px rgba(49, 61, 90, 0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Inner concentric rings */}
            <div
              style={{
                position: 'absolute',
                width: 68,
                height: 68,
                borderRadius: '50%',
                border: '1px dashed rgba(115, 98, 138, 0.4)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid rgba(115, 98, 138, 0.25)',
              }}
            />

            {/* Reticle crosshair */}
            <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(115, 98, 138, 0.25)' }} />
            <div style={{ position: 'absolute', height: '100%', width: 1, background: 'rgba(115, 98, 138, 0.25)' }} />

            {/* Rotating radar sweep beam */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(115, 98, 138, 0.6) 0deg, rgba(203, 197, 234, 0.3) 45deg, transparent 90deg)',
                animation: 'radarSpin 2s linear infinite',
              }}
            />

            {/* Animated Radar Blips (Simulated Entity Pings) */}
            <div
              style={{
                position: 'absolute',
                top: 26,
                left: 68,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--twilight-indigo)',
                boxShadow: '0 0 8px var(--periwinkle)',
                animation: 'radarPing 1.8s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: 28,
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--vintage-lavender)',
                animation: 'radarPing 2.4s ease-in-out infinite 0.7s',
              }}
            />

            {/* Center target origin */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--twilight-indigo)',
                border: '1.5px solid #ffffff',
                boxShadow: '0 0 10px rgba(49, 61, 90, 0.5)',
                zIndex: 3,
              }}
            />
          </div>
        </div>

        {/* Step Progress Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 28 }}>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={step.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: isDone
                    ? 'var(--twilight-indigo)'
                    : isCurrent
                    ? 'var(--jet-black)'
                    : 'var(--text-muted)',
                  transition: 'color 0.2s ease',
                }}
              >
                <span
                  style={{
                    width: 50,
                    flexShrink: 0,
                    fontWeight: 800,
                    color: isDone
                      ? 'var(--vintage-lavender)'
                      : isCurrent
                      ? 'var(--twilight-indigo)'
                      : 'var(--text-muted)',
                    background: isCurrent ? 'rgba(203, 197, 234, 0.45)' : 'transparent',
                    padding: isCurrent ? '2px 6px' : '2px 0',
                    borderRadius: 2,
                    textAlign: isCurrent ? 'center' : 'left',
                  }}
                >
                  {isDone ? '[DONE]' : isCurrent ? '[RUN]' : '[WAIT]'}
                </span>
                <span
                  style={{
                    letterSpacing: '0.01em',
                    fontWeight: isCurrent ? 700 : isDone ? 500 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer info bar */}
        <div
          style={{
            borderTop: '1px solid var(--border-hairline)',
            paddingTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-dim)',
          }}
        >
          <span>AUTONOMOUS ENGINE: NETWORKX</span>
          <span style={{ color: 'var(--vintage-lavender)', fontWeight: 700 }}>COMPILING INTELLIGENCE...</span>
        </div>
      </div>
    </div>
  );
}
