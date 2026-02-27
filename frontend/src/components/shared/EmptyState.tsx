import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 opacity-30" style={{ color: 'var(--color-text-secondary)' }}>
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>
      {action}
    </div>
  );
}
