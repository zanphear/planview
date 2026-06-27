import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/users';
import { useAuthStore } from '../stores/authStore';

export function OIDCCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const savedState = sessionStorage.getItem('oidc_state');

    if (!code) {
      setError('No authorization code received from identity provider.');
      return;
    }

    if (state && savedState && state !== savedState) {
      setError('State mismatch, possible CSRF attack. Please try again.');
      return;
    }

    sessionStorage.removeItem('oidc_state');

    (async () => {
      try {
        const { data } = await authApi.oidcCallback(code, state || '');
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        await fetchMe();
        navigate('/', { replace: true });
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setError(msg || 'OIDC login failed. Please try again.');
      }
    })();
  }, [searchParams, navigate, fetchMe]);

  if (error) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1B1534 0%, #4D217A 50%, #1B1534 100%)' }}
      >
        <div className="w-full max-w-md rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Login Failed</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-danger)' }}>{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="px-4 py-2 text-white rounded-lg font-medium transition-colors hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #8A00E5, #4D217A)' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1B1534 0%, #4D217A 50%, #1B1534 100%)' }}
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4" />
        <p className="text-white text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}

export default OIDCCallbackPage;
