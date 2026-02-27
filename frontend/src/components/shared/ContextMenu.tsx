import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  separator?: boolean;
  onClick: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position if menu would overflow viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-xl py-1 min-w-[180px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="border-t border-[var(--color-border)] my-1" />
        ) : (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
              item.danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-[var(--color-text)] hover:bg-[var(--color-grey-2)]'
            }`}
          >
            {item.icon && <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
