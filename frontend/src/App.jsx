import { useState } from 'react'
import { investigateByAPI, investigateByDocument, resumeInvestigation } from './api/client'
import DualEntryGateway from './components/DualEntryGateway'
import LoadingScreen from './components/LoadingScreen'
import HitlUploadZone from './components/HitlUploadZone'
// Person B replaces this file with full graph visualization
import InvestigationView from './components/InvestigationView'

function InvestigationPlaceholder({ data, onReset }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        cursor: 'pointer',
        color: '#e2e8f0',
        background: '#0a0f1a',
      }}
    >
      <div style={{ fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
        ⏳ Waiting for Person B&apos;s InvestigationView component&hellip;
      </div>
      <div style={{
        background: '#111827',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '28px 48px',
        textAlign: 'center',
        minWidth: '280px',
      }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Risk Score
        </div>
        <div style={{ fontSize: '56px', fontWeight: '700', color: '#F44336', lineHeight: 1 }}>
          {data?.risk_score ?? '—'}
        </div>
        <div style={{ fontSize: '14px', color: '#F44336', marginTop: '8px', fontWeight: '600' }}>
          {data?.risk_label}
        </div>
        {data?.resolved_ubo && (
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
            UBO: {data.resolved_ubo}
          </div>
        )}
        <button
          onClick={onReset}
          style={{
            marginTop: '20px',
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', borderRadius: '6px',
            padding: '8px 20px', fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ← New Investigation
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('gateway')
  const [investigationData, setInvestigationData] = useState(null)
  const [pausedState, setPausedState] = useState(null)
  const [error, setError] = useState(null)
  const [lastCrn, setLastCrn] = useState('')

  function handleApiResult(result) {
    if (result.status === 'paused') {
      setPausedState(result)
      setScreen('paused')
    } else {
      setInvestigationData(result)
      setScreen('results')
    }
  }

  async function handleInvestigateAPI(crn) {
    setScreen('loading')
    setError(null)
    setInvestigationData(null)  // clear stale data immediately
    setLastCrn(crn)
    try {
      const result = await investigateByAPI(crn)
      handleApiResult(result)
    } catch (err) {
      setError(err.message)
      setScreen('gateway')
    }
  }

  async function handleInvestigateDocument(file) {
    setScreen('loading')
    setError(null)
    try {
      const result = await investigateByDocument(file)
      handleApiResult(result)
    } catch (err) {
      setError(err.message)
      setScreen('gateway')
    }
  }

  async function handleResume(file) {
    setScreen('loading')
    try {
      const result = await resumeInvestigation(pausedState.thread_id, file)
      handleApiResult(result)
    } catch (err) {
      setError(err.message)
      setScreen('paused')
    }
  }

  function handleReset() {
    setScreen('gateway')
    setInvestigationData(null)
    setPausedState(null)
    setError(null)
  }

  function renderResults() {
    return (
      <InvestigationView
        key={investigationData.thread_id}  // force full remount on each new result
        data={investigationData}
        crn={lastCrn}
        onReset={handleReset}
        onUploadDocument={handleInvestigateDocument}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark, #13111F)', color: 'var(--text-light, #F0EEF8)' }}>
      {screen === 'gateway' && (
        <DualEntryGateway
          onInvestigateAPI={handleInvestigateAPI}
          onInvestigateDocument={handleInvestigateDocument}
          error={error}
        />
      )}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'paused' && (
        <HitlUploadZone
          pauseReason={pausedState?.pause_reason}
          partialGraph={pausedState?.partial_graph}
          riskScore={pausedState?.risk_score}
          onResume={handleResume}
          onReset={handleReset}
        />
      )}
      {screen === 'results' && renderResults()}
    </div>
  )
}
