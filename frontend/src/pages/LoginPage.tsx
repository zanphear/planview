import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi, type OIDCConfig } from '../api/users';

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig | null>(null);
  const [oidcLoading, setOidcLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await authApi.oidcConfig();
        if (data.enabled) setOidcConfig(data);
      } catch {
        // OIDC not available
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password, totpCode || undefined);
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string }; status?: number } })?.response?.data?.detail;
      if (msg === '2FA code required') {
        setNeeds2fa(true);
        setError('');
      } else {
        setError(msg || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOIDCLogin = async () => {
    setOidcLoading(true);
    setError('');
    try {
      const redirectUri = `${window.location.origin}/auth/oidc/callback`;
      const { data } = await authApi.oidcAuthorize(redirectUri);
      sessionStorage.setItem('oidc_state', data.state);
      window.location.href = data.redirect_url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to initiate SSO login');
      setOidcLoading(false);
    }
  };

  const isOidcOnly = oidcConfig?.auth_mode === 'oidc_only';
  const showPasswordForm = !isOidcOnly;
  const showOidcButton = oidcConfig?.enabled;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1B1534 0%, #4D217A 50%, #1B1534 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-color.png" alt="Siemens Energy" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Planview</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isOidcOnly ? 'Sign in with your identity provider' : isRegister ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        {/* OIDC-only mode */}
        {isOidcOnly && showOidcButton && (
          <div className="space-y-4">
            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(228, 67, 50, 0.1)', color: 'var(--color-danger)' }}>{error}</div>
            )}
            <button
              onClick={handleOIDCLogin}
              disabled={oidcLoading}
              className="w-full py-2.5 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:shadow-lg flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {oidcLoading ? 'Redirecting...' : 'Sign in with SSO'}
            </button>
          </div>
        )}

        {/* Password form (hybrid or password mode) */}
        {showPasswordForm && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none transition-shadow"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none transition-shadow"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none transition-shadow"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                  placeholder="••••••••"
                />
              </div>

              {needs2fa && !isRegister && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>2FA Code</label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    autoFocus
                    className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 outline-none transition-shadow text-center font-mono tracking-widest"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
                    placeholder="000000"
                  />
                </div>
              )}

              {error && (
                <div className="text-sm px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(228, 67, 50, 0.1)', color: 'var(--color-danger)' }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
              >
                {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* OIDC button in hybrid mode */}
            {showOidcButton && (
              <>
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>or</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                </div>
                <button
                  onClick={handleOIDCLogin}
                  disabled={oidcLoading}
                  className="w-full py-2.5 rounded-lg font-medium border disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:shadow-md flex items-center justify-center gap-2"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  {oidcLoading ? 'Redirecting...' : 'Sign in with SSO'}
                </button>
              </>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-sm hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </>
        )}

        <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Visual Planning & Scheduling</p>
        </div>
      </div>
    </div>
  );
}
