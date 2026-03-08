import { STATUS_COLOURS } from '../../utils/colours';

interface StatusBadgeProps {
  status: string;
  label?: string;
  colour?: string;
}

export function StatusBadge({ status, label, colour }: StatusBadgeProps) {
  const c = colour || STATUS_COLOURS[status] || '#64748b';
  const display = label || status.replace(/_/g, ' ');
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: c + '18', color: c }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
      {display}
    </span>
  );
}
