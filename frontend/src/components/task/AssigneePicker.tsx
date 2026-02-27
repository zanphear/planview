import { Avatar } from '../shared/Avatar';
import type { User } from '../../api/users';

interface AssigneePickerProps {
  members: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AssigneePicker({ members, selectedIds, onChange }: AssigneePickerProps) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => {
        const selected = selectedIds.includes(member.id);
        return (
          <button
            key={member.id}
            onClick={() => toggle(member.id)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors"
            style={{
              backgroundColor: selected ? 'var(--color-primary-light)' : 'var(--color-grey-2)',
              color: selected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow: selected ? 'inset 0 0 0 1px var(--color-primary)' : undefined,
            }}
          >
            <Avatar name={member.name} initials={member.initials} colour={member.colour} size={20} />
            {member.name}
          </button>
        );
      })}
    </div>
  );
}
