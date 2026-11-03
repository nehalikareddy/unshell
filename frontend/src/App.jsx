import { useState } from 'react';
import { investigateByAPI } from './api/client';
import DualEntryGateway from './components/DualEntryGateway';
import LoadingScreen from './components/LoadingScreen';
import InvestigationView from './components/InvestigationView';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const [screen, setScreen]                 = useState('gateway');
  const [investigationData, setData]        = useState(null);
  const [error, setError]                   = useState(null);
  const [lastCrn, setLastCrn]               = useState('');

  async function handleInvestigateAPI(crn) {
    setScreen('loading');
    setError(null);
    setData(null);
    setLastCrn(crn);
    try {
      const result = await investigateByAPI(crn);
      setData(result);
      setScreen('results');
    } catch (err) {
      setError(err.message);
      setScreen('gateway');
    }
  }

  function handleReset() {
    setScreen('gateway');
    setData(null);
    setError(null);
  }

  function handleLoadHistory(savedData) {
    setData(savedData);
    setLastCrn(savedData?.crn || '');
    setScreen('results');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-obsidian)', color: 'var(--text-white)' }}>
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />

      {screen === 'gateway' && (
        <DualEntryGateway
          onInvestigateAPI={handleInvestigateAPI}
          onLoadHistory={handleLoadHistory}
          error={error}
        />
      )}

      {screen === 'loading' && <LoadingScreen crn={lastCrn} />}

      {screen === 'results' && (
        <InvestigationView
          key={investigationData?.thread_id || lastCrn}
          data={investigationData}
          crn={lastCrn}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
