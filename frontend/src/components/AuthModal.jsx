import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e?.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setIsSubmitting(true);
    try {
      await demoLogin();
      onClose();
    } catch (err) {
      setError(err.message || 'Demo authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="has-pin has-pin--top-left has-pin--top-right has-pin--bottom-left has-pin--bottom-right"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 30px rgba(192,254,4,0.08)',
          position: 'relative',
          padding: '36px 32px',
        }}
      >
        {/* Header Telemetry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="telemetry-tag lime">
            <span className="live-dot" />
            AUTH_TERMINAL // SEC-01
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 18,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              padding: '0 4px',
            }}
          >
            [X]
          </button>
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: 'var(--text-white)',
            marginBottom: 6,
          }}
        >
          {mode === 'login' ? 'Investigator Login' : 'Register Credentials'}
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.5 }}>
          {mode === 'login'
            ? 'Sign in to access your private, isolated investigation graph archive.'
            : 'Create your forensic operator account to isolate your intelligence dossiers.'}
        </p>

        {/* Mode switcher tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            background: 'var(--bg-surface)',
            padding: 3,
            border: '1px solid var(--border-hairline)',
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'login' ? 'var(--accent-lime)' : 'var(--text-dim)',
              border: mode === 'login' ? '1px solid var(--border-lime)' : '1px solid transparent',
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              background: mode === 'register' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'register' ? 'var(--accent-lime)' : 'var(--text-dim)',
              border: mode === 'register' ? '1px solid var(--border-lime)' : '1px solid transparent',
              padding: '8px 0',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div
            style={{
              background: 'var(--accent-red-dim)',
              border: '1px solid rgba(255, 65, 54, 0.4)',
              color: 'var(--accent-red)',
              fontSize: 12,
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              marginBottom: 18,
            }}
          >
            ERR // {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: 'var(--text-dim)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                OPERATOR_NAME
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Haoqi Wen"
                style={{
                  width: '100%',
                  height: 42,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-white)',
                  padding: '0 14px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent-lime)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--text-dim)',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              EMAIL_ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@unshell.ai"
              style={{
                width: '100%',
                height: 42,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-white)',
                padding: '0 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
                transition: 'border 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-lime)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--text-dim)',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              ACCESS_KEY / PASSWORD
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: '100%',
                height: 42,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-white)',
                padding: '0 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                outline: 'none',
                transition: 'border 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-lime)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              height: 46,
              background: 'var(--twilight-indigo)',
              color: '#ffffff',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.1s',
              boxShadow: '0 4px 16px rgba(49, 61, 90, 0.2)',
            }}
          >
            {isSubmitting
              ? 'AUTHENTICATING...'
              : mode === 'login'
              ? 'ACCESS FORENSIC WORKSPACE →'
              : 'INITIALIZE ACCOUNT →'}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '22px 0 16px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
          <span>FAST PASS EVALUATION</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
        </div>

        {/* 1-Click Demo Login */}
        <button
          type="button"
          onClick={handleDemo}
          disabled={isSubmitting}
          className="dotted-btn"
          style={{
            width: '100%',
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: 'var(--accent-lime)' }}>⚡</span>
          <span>1-CLICK DEMO OPERATOR (ANALYST@UNSHELL.AI)</span>
        </button>
      </div>
    </div>
  );
}
