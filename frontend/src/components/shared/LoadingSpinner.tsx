interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({ size = 32, message, fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        style={{ color: 'var(--color-primary)' }}
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {message && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}
