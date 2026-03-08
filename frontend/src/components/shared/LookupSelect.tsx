import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useLookupStore, useLookupValues } from '../../stores/lookupStore';

interface LookupSelectProps {
  category: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  showAll?: boolean;
}

export function LookupSelect({
  category,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  style,
  showAll = false,
}: LookupSelectProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const loading = useLookupStore((s) => s.loading[category]);
  const activeValues = useLookupValues(workspace?.id, category);

  // If showAll, include inactive too
  const allValues = showAll
    ? (useLookupStore.getState().cache[category] || [])
    : activeValues;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
      disabled={loading}
    >
      <option value="">{loading ? 'Loading...' : placeholder}</option>
      {allValues.map((v) => (
        <option key={v.id} value={v.value} disabled={!v.is_active}>
          {v.label || v.value}
        </option>
      ))}
    </select>
  );
}
