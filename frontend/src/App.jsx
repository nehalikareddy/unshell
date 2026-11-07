import { useState } from 'react';
import { investigateByAPI, investigateByDocument, normalizeCrn } from './api/client';
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
    const cleanCrn = normalizeCrn(crn);
    setScreen('loading');
    setError(null);
    setData(null);
    setLastCrn(cleanCrn);
    try {
      const result = await investigateByAPI(cleanCrn);
      setData(result);
      setScreen('results');
    } catch (err) {
      setError(err.message || 'Investigation failed. Please try again.');
      setScreen('gateway');
    }
  }

  async function handleInvestigateDocument(pdfFile) {
    if (!pdfFile) return;
    setScreen('loading');
    setError(null);
    setData(null);
    setLastCrn(pdfFile.name);
    try {
      const result = await investigateByDocument(pdfFile);
      setData(result);
      setScreen('results');
    } catch (err) {
      setError(err.message || 'Document extraction failed. Please try again.');
      setScreen('gateway');
    }
  }

  function handleReset() {
    setScreen('gateway');
    setData(null);
    setError(null);
  }

  function handleLoadHistory(savedData) {
    setError(null);
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
          onInvestigateDocument={handleInvestigateDocument}
          onLoadHistory={handleLoadHistory}
          error={error}
          onClearError={() => setError(null)}
        />
      )}

      {screen === 'loading' && <LoadingScreen crn={lastCrn} />}

      {screen === 'results' && (
        <InvestigationView
          key={investigationData?.thread_id || investigationData?._id || lastCrn}
          data={investigationData}
          crn={lastCrn}
          onReset={handleReset}
          onUploadDocument={handleInvestigateDocument}
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
