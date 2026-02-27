import { DEFAULT_STATUSES } from '../../utils/constants';

interface StatusPickerProps {
  value: string;
  onChange: (status: string) => void;
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
    >
      {DEFAULT_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.emoji} {s.label}
        </option>
      ))}
    </select>
  );
}
