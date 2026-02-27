import { useState } from 'react';
import { X, Star, Trash2 } from 'lucide-react';
import { type Project } from '../../api/projects';
import { ColourPicker } from '../task/ColourPicker';

interface ProjectEditModalProps {
  project: Project;
  onSave: (updates: Partial<Project>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ProjectEditModal({ project, onSave, onDelete, onClose }: ProjectEditModalProps) {
  const [name, setName] = useState(project.name);
  const [colour, setColour] = useState(project.colour);
  const [isFavourite, setIsFavourite] = useState(project.is_favourite);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const updates: Partial<Project> = {};
    if (name.trim() && name !== project.name) updates.name = name.trim();
    if (colour !== project.colour) updates.colour = colour;
    if (isFavourite !== project.is_favourite) updates.is_favourite = isFavourite;
    if (Object.keys(updates).length > 0) onSave(updates);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] rounded-xl shadow-2xl z-50 border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Edit Project</h3>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Colour</label>
            <ColourPicker value={colour} onChange={setColour} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setIsFavourite(!isFavourite)}
              className="p-1 rounded"
              style={{ color: isFavourite ? '#f59e0b' : 'var(--color-text-secondary)' }}
            >
              <Star size={18} fill={isFavourite ? 'currentColor' : 'none'} />
            </button>
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>Favourite</span>
          </label>

          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
                Delete project
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this project and all its tasks?</span>
                <button
                  onClick={onDelete}
                  className="px-2.5 py-1 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-sm rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {!confirmDelete && (
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm rounded-lg"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-sm text-white rounded-lg font-medium disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
