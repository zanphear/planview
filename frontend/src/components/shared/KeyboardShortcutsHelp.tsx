import { X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { group: 'Timeline Zoom', items: [
    { keys: ['W'], description: 'Week view' },
    { keys: ['M'], description: 'Month view' },
    { keys: ['Q'], description: 'Quarter view' },
    { keys: ['A'], description: 'Annual view' },
    { keys: ['T'], description: 'Scroll to today' },
  ]},
  { group: 'Navigation', items: [
    { keys: ['Ctrl', 'K'], description: 'Quick search' },
    { keys: ['Ctrl', 'B'], description: 'Toggle sidebar' },
    { keys: ['N'], description: 'New task (in taskbox)' },
    { keys: ['?'], description: 'Show this help' },
  ]},
  { group: 'Task Actions', items: [
    { keys: ['Esc'], description: 'Close panel / modal' },
    { keys: ['Del'], description: 'Delete selected task' },
  ]},
];

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-md overflow-hidden border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-80" style={{ color: 'var(--color-text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {group.group}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between py-1">
                    <span className="text-sm" style={{ color: 'var(--color-text)' }}>{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          <kbd
                            className="inline-block px-1.5 py-0.5 text-xs font-mono rounded border min-w-[24px] text-center"
                            style={{ backgroundColor: 'var(--color-grey-1)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                          >
                            {key}
                          </kbd>
                          {i < item.keys.length - 1 && (
                            <span className="text-xs mx-0.5" style={{ color: 'var(--color-text-secondary)' }}>+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
