import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/users';
import { useAuthStore } from '../stores/authStore';

export function OIDCCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // The code-for-token exchange is a genuine one-shot side effect: model it as a
  // mutation and fire it exactly once on mount (the ref guards StrictMode double-invoke).
  const exchange = useMutation({
    mutationFn: async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const savedState = sessionStorage.getItem('oidc_state');

      if (!code) {
        throw new Error('No authorization code received from identity provider.');
      }
      if (state && savedState && state !== savedState) {
        throw new Error('State mismatch, possible CSRF attack. Please try again.');
      }

      sessionStorage.removeItem('oidc_state');

      const { data } = await authApi.oidcCallback(code, state || '');
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchMe();
      navigate('/', { replace: true });
    },
  });

  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    exchange.mutate();
  }, [exchange]);

  const err = exchange.error;
  let error = '';
  if (err) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      // API failure: surface the server-provided detail, else a generic message.
      error =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ??
        'OIDC login failed. Please try again.';
    } else {
      // Validation failure thrown above (no auth code / state mismatch).
      error = err instanceof Error ? err.message : 'OIDC login failed. Please try again.';
    }
  }

  if (error) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1B1534 0%, #4D217A 50%, #1B1534 100%)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl p-8"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              Login Failed
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
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
