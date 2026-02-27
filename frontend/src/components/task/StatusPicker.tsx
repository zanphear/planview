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
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
    >
      {DEFAULT_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.emoji} {s.label}
        </option>
      ))}
    </select>
  );
}
