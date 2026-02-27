import { X, Trash2, ArrowRight, Users } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_STATUSES } from '../../utils/constants';
import type { User } from '../../api/users';

interface BulkActionBarProps {
  count: number;
  members: User[];
  onStatusChange: (status: string) => void;
  onAssign: (userId: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, members, onStatusChange, onAssign, onDelete, onClear }: BulkActionBarProps) {
  const [showStatus, setShowStatus] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border animate-fade-in"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
        {count} selected
      </span>

      <div className="w-px h-5" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Move to status */}
      <div className="relative">
        <button
          onClick={() => { setShowStatus(!showStatus); setShowAssign(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <ArrowRight size={14} />
          Move to
        </button>
        {showStatus && (
          <div
            className="absolute bottom-full mb-2 left-0 rounded-lg border shadow-xl py-1 min-w-[160px]"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {DEFAULT_STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => { onStatusChange(s.id); setShowStatus(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-grey-1)] flex items-center gap-2"
                style={{ color: 'var(--color-text)' }}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assign */}
      <div className="relative">
        <button
          onClick={() => { setShowAssign(!showAssign); setShowStatus(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <Users size={14} />
          Assign
        </button>
        {showAssign && (
          <div
            className="absolute bottom-full mb-2 left-0 rounded-lg border shadow-xl py-1 min-w-[180px] max-h-48 overflow-y-auto"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => { onAssign(m.id); setShowAssign(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-grey-1)] flex items-center gap-2"
                style={{ color: 'var(--color-text)' }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                  style={{ backgroundColor: m.colour }}
                >
                  {m.initials || m.name[0]}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors"
        style={{ color: 'var(--color-danger)' }}
      >
        <Trash2 size={14} />
        Delete
      </button>

      <div className="w-px h-5" style={{ backgroundColor: 'var(--color-border)' }} />

      {/* Clear selection */}
      <button
        onClick={onClear}
        className="p-1.5 rounded-lg hover:bg-[var(--color-grey-1)] transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
