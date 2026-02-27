import type { ZoomLevel } from '../../utils/dates';

interface ZoomControlsProps {
  value: ZoomLevel;
  onChange: (level: ZoomLevel) => void;
}

const LEVELS: ZoomLevel[] = ['W', 'M', 'Q', 'A'];

export function ZoomControls({ value, onChange }: ZoomControlsProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            value === level
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
