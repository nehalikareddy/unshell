import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('unshell_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('unshell_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync token to localStorage and verify session on load
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('unshell_user', JSON.stringify(data.user));
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('[Auth] Token verification failed:', err);
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  function saveAuth(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('unshell_token', newToken);
    localStorage.setItem('unshell_user', JSON.stringify(newUser));
  }

  async function login(email, password) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }
    saveAuth(data.token, data.user);
    setAuthModalOpen(false);
    return data.user;
  }

  async function register(name, email, password, role = 'Forensic Investigator') {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    saveAuth(data.token, data.user);
    setAuthModalOpen(false);
    return data.user;
  }

  async function demoLogin() {
    const demoEmail = 'analyst@unshell.ai';
    const demoPassword = 'investigator123!';
    try {
      return await login(demoEmail, demoPassword);
    } catch {
      // If user doesn't exist yet, auto-register then login
      return await register('Special Agent Wen', demoEmail, demoPassword, 'Senior AML Forensics');
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('unshell_token');
    localStorage.removeItem('unshell_user');
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        isAuthModalOpen,
        openAuthModal: () => setAuthModalOpen(true),
        closeAuthModal: () => setAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
