interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colour: string;
  sub?: string;
}

export function StatCard({ label, value, icon, colour, sub }: StatCardProps) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: colour + '18', color: colour }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          {value}
        </p>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
