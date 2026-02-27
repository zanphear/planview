import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

let addToast: ((message: string, action?: { label: string; onClick: () => void }) => void) | null = null;
let nextId = 0;

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 6000 : 4000);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addToast = add;
    return () => { addToast = null; };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm animate-slide-in"
        >
          <span className="text-sm flex-1">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                remove(toast.id);
              }}
              className="text-sm font-medium px-2 py-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
              style={{ color: '#A855F7' }}
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => remove(toast.id)}
            className="text-gray-400 hover:text-white shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Mount the toast container once
let mounted = false;
function ensureMounted() {
  if (mounted) return;
  mounted = true;
  const div = document.createElement('div');
  div.id = 'toast-root';
  document.body.appendChild(div);
  const root = createRoot(div);
  root.render(<ToastContainer />);
}

export const Toast = {
  show(message: string, action?: { label: string; onClick: () => void }) {
    ensureMounted();
    if (addToast) {
      addToast(message, action);
    } else {
      setTimeout(() => addToast?.(message, action), 50);
    }
  },
};
