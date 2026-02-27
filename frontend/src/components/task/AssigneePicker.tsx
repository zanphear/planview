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
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors ${
              selected
                ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Avatar name={member.name} initials={member.initials} colour={member.colour} size={20} />
            {member.name}
          </button>
        );
      })}
    </div>
  );
}
