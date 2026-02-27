import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle size={48} className="text-red-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Something went wrong
          </h3>
          <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--color-text-secondary)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-primary)' }}
          >
            <RefreshCw size={14} />
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
