import type { ZoomLevel } from '../../utils/dates';

interface ZoomControlsProps {
  value: ZoomLevel;
  onChange: (level: ZoomLevel) => void;
}

const LEVELS: ZoomLevel[] = ['W', 'M', 'Q', 'A'];

export function ZoomControls({ value, onChange }: ZoomControlsProps) {
  return (
    <div className="flex rounded-lg p-0.5" style={{ backgroundColor: 'var(--color-grey-2)' }}>
      {LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === level ? 'shadow-sm' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: value === level ? 'var(--color-surface)' : undefined,
            color: value === level ? 'var(--color-text)' : 'var(--color-text-secondary)',
          }}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
