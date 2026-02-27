import { useState } from 'react';
import { Repeat } from 'lucide-react';

interface RecurrencePickerProps {
  isRecurring: boolean;
  rule: string | null;
  onChange: (isRecurring: boolean, rule: string | null) => void;
}

const PRESETS = [
  { label: 'Daily', rule: 'FREQ=DAILY;INTERVAL=1' },
  { label: 'Weekdays', rule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Weekly', rule: 'FREQ=WEEKLY;INTERVAL=1' },
  { label: 'Bi-weekly', rule: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Monthly', rule: 'FREQ=MONTHLY;INTERVAL=1' },
  { label: 'Yearly', rule: 'FREQ=YEARLY;INTERVAL=1' },
];

function describeRule(rule: string | null): string {
  if (!rule) return 'No repeat';
  const match = PRESETS.find((p) => p.rule === rule);
  if (match) return match.label;
  // Parse for display
  const parts: Record<string, string> = {};
  rule.split(';').forEach((p) => {
    const [k, v] = p.split('=');
    if (k && v) parts[k] = v;
  });
  const freq = parts.FREQ?.toLowerCase() || 'unknown';
  const interval = parseInt(parts.INTERVAL || '1');
  if (interval === 1) return `Every ${freq.replace('ly', '')}`;
  return `Every ${interval} ${freq.replace('ly', '')}s`;
}

export function RecurrencePicker({ isRecurring, rule, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
        <Repeat size={12} className="inline mr-1" />
        Repeat
      </label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-left px-3 py-1.5 text-sm border rounded-lg flex items-center gap-2"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: isRecurring ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}
        >
          <Repeat size={14} />
          {isRecurring ? describeRule(rule) : 'No repeat'}
        </button>

        {open && (
          <div
            className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg py-1"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={() => { onChange(false, null); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-grey-1)]"
              style={{ color: isRecurring ? 'var(--color-text-secondary)' : 'var(--color-primary)' }}
            >
              No repeat
            </button>
            {PRESETS.map((preset) => (
              <button
                key={preset.rule}
                onClick={() => { onChange(true, preset.rule); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-grey-1)]"
                style={{ color: rule === preset.rule ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
