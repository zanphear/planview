import { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { feedbackApi } from '../../api/feedback';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Toast } from '../shared/Toast';

interface FeatureRequestModalProps {
  onClose: () => void;
}

export function FeatureRequestModal({ onClose }: FeatureRequestModalProps) {
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!workspace || !title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await feedbackApi.create(workspace.id, {
        type: 'feature',
        title: title.trim(),
        description: description.trim(),
      });
      Toast.show('Feature request submitted');
      onClose();
    } catch {
      Toast.show('Failed to submit feature request');
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-xl shadow-2xl z-50 border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500" />
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Request a Feature
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What feature would you like?"
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2"
              style={
                {
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  '--tw-ring-color': 'var(--color-primary)',
                } as React.CSSProperties
              }
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature and why it would be useful"
              rows={5}
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 resize-none"
              style={
                {
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  '--tw-ring-color': 'var(--color-primary)',
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        <div
          className="flex justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
            className="px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {submitting ? 'Submitting...' : 'Submit Feature Request'}
          </button>
        </div>
      </div>
    </>
  );
}
