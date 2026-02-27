import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { DEFAULT_STATUSES } from '../../utils/constants';
import type { User } from '../../api/users';

export interface FilterState {
  status: string | null;
  assignee: string | null;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  members?: User[];
}

export function FilterBar({ filters, onChange, members = [] }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = filters.status !== null || filters.assignee !== null;

  const clearAll = () => {
    onChange({ status: null, assignee: null });
  };

  if (!showFilters && !hasFilters) {
    return (
      <button
        onClick={() => setShowFilters(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-grey-2)' }}
      >
        <Filter size={12} />
        Filter
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter size={12} style={{ color: 'var(--color-text-secondary)' }} />

      {/* Status filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || null })}
        className="text-xs px-2 py-1 rounded-lg border outline-none"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
      >
        <option value="">All statuses</option>
        {DEFAULT_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
        ))}
      </select>

      {/* Assignee filter */}
      {members.length > 0 && (
        <select
          value={filters.assignee || ''}
          onChange={(e) => onChange({ ...filters, assignee: e.target.value || null })}
          className="text-xs px-2 py-1 rounded-lg border outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:opacity-80"
          style={{ color: 'var(--color-danger)' }}
        >
          <X size={12} />
          Clear
        </button>
      )}

      {!hasFilters && (
        <button
          onClick={() => setShowFilters(false)}
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
